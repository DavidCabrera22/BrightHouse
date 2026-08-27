import { AutomationsRunner } from './automations.runner';
import { Automation } from './entities/automation.entity';
import { Lead } from '../leads/entities/lead.entity';

/** Postgres unique-violation shape, which is how dedup is detected. */
const uniqueViolation = Object.assign(new Error('duplicate key value'), { code: '23505' });

const PROJECT_A = 'project-a';
const PROJECT_B = 'project-b';
const TENANT_A = 'tenant-a';

const makeLead = (overrides: Partial<Lead> = {}): Lead =>
  ({
    id: 'lead-1',
    name: 'Ana Torres',
    phone: '573001112233',
    source: 'whatsapp',
    status: 'new',
    project_id: PROJECT_A,
    interested_in: 'Apto 302',
    created_at: new Date(),
    ...overrides,
  }) as Lead;

const makeAutomation = (overrides: Partial<Automation> = {}): Automation =>
  ({
    id: 'auto-1',
    name: 'Bienvenida',
    project_id: PROJECT_A,
    status: 'active',
    trigger_type: 'lead_created',
    trigger_config: {},
    action_type: 'send_whatsapp',
    action_config: { message: 'Hola {{nombre}}, gracias por tu interés en {{proyecto}}.' },
    runs_count: 0,
    project: { id: PROJECT_A, name: 'Oasis Park', tenant_id: TENANT_A } as any,
    ...overrides,
  }) as Automation;

describe('AutomationsRunner', () => {
  let runner: AutomationsRunner;
  let runRepository: any;
  let leadRepository: any;
  let tenantRepository: any;
  let automationsService: any;
  let whapiService: any;

  beforeEach(() => {
    runRepository = {
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    };
    leadRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
    };
    tenantRepository = {
      findOne: jest.fn().mockResolvedValue({ id: TENANT_A, whapi_token: 'tenant-token' }),
    };
    automationsService = {
      findActiveByTrigger: jest.fn().mockResolvedValue([]),
      recordRun: jest.fn().mockResolvedValue(undefined),
    };
    whapiService = { sendText: jest.fn().mockResolvedValue(true) };

    runner = new AutomationsRunner(
      runRepository,
      leadRepository,
      tenantRepository,
      automationsService,
      whapiService,
    );
  });

  describe('lead_created', () => {
    it('runs an automation whose project matches the lead', async () => {
      leadRepository.findOne.mockResolvedValue(makeLead());
      automationsService.findActiveByTrigger.mockResolvedValue([makeAutomation()]);

      await runner.handleLeadCreated({ leadId: 'lead-1' });

      expect(whapiService.sendText).toHaveBeenCalledTimes(1);
    });

    it('never runs an automation from a different project', async () => {
      leadRepository.findOne.mockResolvedValue(makeLead({ project_id: PROJECT_B }));
      automationsService.findActiveByTrigger.mockResolvedValue([makeAutomation()]);

      await runner.handleLeadCreated({ leadId: 'lead-1' });

      expect(whapiService.sendText).not.toHaveBeenCalled();
      expect(runRepository.insert).not.toHaveBeenCalled();
    });

    it('honours a source filter on the trigger', async () => {
      leadRepository.findOne.mockResolvedValue(makeLead({ source: 'web' }));
      automationsService.findActiveByTrigger.mockResolvedValue([
        makeAutomation({ trigger_config: { source: 'whatsapp' } }),
      ]);

      await runner.handleLeadCreated({ leadId: 'lead-1' });

      expect(whapiService.sendText).not.toHaveBeenCalled();
    });

    it('does nothing when the lead no longer exists', async () => {
      leadRepository.findOne.mockResolvedValue(null);
      automationsService.findActiveByTrigger.mockResolvedValue([makeAutomation()]);

      await runner.handleLeadCreated({ leadId: 'gone' });

      expect(whapiService.sendText).not.toHaveBeenCalled();
    });
  });

  describe('lead_status_changed', () => {
    it('runs only when the new status matches the configured one', async () => {
      leadRepository.findOne.mockResolvedValue(makeLead({ status: 'qualified' }));
      automationsService.findActiveByTrigger.mockResolvedValue([
        makeAutomation({
          trigger_type: 'lead_status_changed',
          trigger_config: { to_status: 'qualified' },
        }),
      ]);

      await runner.handleLeadStatusChanged({ leadId: 'lead-1', from: 'new', to: 'qualified' });

      expect(whapiService.sendText).toHaveBeenCalledTimes(1);
    });

    it('ignores a transition to a different status', async () => {
      leadRepository.findOne.mockResolvedValue(makeLead({ status: 'lost' }));
      automationsService.findActiveByTrigger.mockResolvedValue([
        makeAutomation({
          trigger_type: 'lead_status_changed',
          trigger_config: { to_status: 'qualified' },
        }),
      ]);

      await runner.handleLeadStatusChanged({ leadId: 'lead-1', from: 'new', to: 'lost' });

      expect(whapiService.sendText).not.toHaveBeenCalled();
    });
  });

  describe('deduplication', () => {
    it('does not act twice on the same lead when the run is already claimed', async () => {
      runRepository.insert.mockRejectedValue(uniqueViolation);
      leadRepository.findOne.mockResolvedValue(makeLead());
      automationsService.findActiveByTrigger.mockResolvedValue([makeAutomation()]);

      await runner.handleLeadCreated({ leadId: 'lead-1' });

      expect(whapiService.sendText).not.toHaveBeenCalled();
      expect(automationsService.recordRun).not.toHaveBeenCalled();
    });

    it('claims the run before performing the action', async () => {
      const order: string[] = [];
      runRepository.insert.mockImplementation(async () => {
        order.push('claim');
      });
      whapiService.sendText.mockImplementation(async () => {
        order.push('send');
        return true;
      });
      leadRepository.findOne.mockResolvedValue(makeLead());
      automationsService.findActiveByTrigger.mockResolvedValue([makeAutomation()]);

      await runner.handleLeadCreated({ leadId: 'lead-1' });

      expect(order).toEqual(['claim', 'send']);
    });
  });

  describe('actions', () => {
    it('fills the message template and sends with the tenant token', async () => {
      leadRepository.findOne.mockResolvedValue(makeLead());
      automationsService.findActiveByTrigger.mockResolvedValue([makeAutomation()]);

      await runner.handleLeadCreated({ leadId: 'lead-1' });

      expect(whapiService.sendText).toHaveBeenCalledWith(
        '573001112233',
        'Hola Ana Torres, gracias por tu interés en Oasis Park.',
        'tenant-token',
      );
    });

    it('changes the lead status', async () => {
      leadRepository.findOne.mockResolvedValue(makeLead());
      automationsService.findActiveByTrigger.mockResolvedValue([
        makeAutomation({ action_type: 'change_lead_status', action_config: { status: 'contacted' } }),
      ]);

      await runner.handleLeadCreated({ leadId: 'lead-1' });

      expect(leadRepository.update).toHaveBeenCalledWith('lead-1', { status: 'contacted' });
    });

    it('assigns an agent', async () => {
      leadRepository.findOne.mockResolvedValue(makeLead());
      automationsService.findActiveByTrigger.mockResolvedValue([
        makeAutomation({ action_type: 'assign_agent', action_config: { agent_id: 'agent-9' } }),
      ]);

      await runner.handleLeadCreated({ leadId: 'lead-1' });

      expect(leadRepository.update).toHaveBeenCalledWith('lead-1', {
        assigned_agent_id: 'agent-9',
      });
    });

    it('records the failure when the lead has no phone to message', async () => {
      leadRepository.findOne.mockResolvedValue(makeLead({ phone: '' }));
      automationsService.findActiveByTrigger.mockResolvedValue([makeAutomation()]);

      await runner.handleLeadCreated({ leadId: 'lead-1' });

      expect(whapiService.sendText).not.toHaveBeenCalled();
      expect(runRepository.update).toHaveBeenCalledWith(
        { automation_id: 'auto-1', lead_id: 'lead-1' },
        expect.objectContaining({ status: 'failed' }),
      );
      expect(automationsService.recordRun).toHaveBeenCalledWith(
        'auto-1',
        expect.stringContaining('teléfono'),
      );
    });

    it('records the failure when Whapi rejects the send', async () => {
      whapiService.sendText.mockResolvedValue(false);
      leadRepository.findOne.mockResolvedValue(makeLead());
      automationsService.findActiveByTrigger.mockResolvedValue([makeAutomation()]);

      await runner.handleLeadCreated({ leadId: 'lead-1' });

      expect(runRepository.update).toHaveBeenCalledWith(
        { automation_id: 'auto-1', lead_id: 'lead-1' },
        expect.objectContaining({ status: 'failed' }),
      );
    });
  });

  describe('lead_idle sweep', () => {
    it('only looks at leads inside the automation project', async () => {
      automationsService.findActiveByTrigger.mockResolvedValue([
        makeAutomation({
          trigger_type: 'lead_idle',
          trigger_config: { days: 3, status: 'contacted' },
        }),
      ]);
      leadRepository.find.mockResolvedValue([]);

      await runner.scanIdleLeads();

      const where = leadRepository.find.mock.calls[0][0].where;
      expect(where.project_id).toBe(PROJECT_A);
      expect(where.status).toBe('contacted');
      expect(where.created_at).toBeDefined();
    });

    it('skips an automation with a missing or invalid day count', async () => {
      automationsService.findActiveByTrigger.mockResolvedValue([
        makeAutomation({ trigger_type: 'lead_idle', trigger_config: {} }),
        makeAutomation({ trigger_type: 'lead_idle', trigger_config: { days: 0 } }),
        makeAutomation({ trigger_type: 'lead_idle', trigger_config: { days: -5 } }),
      ]);

      await runner.scanIdleLeads();

      expect(leadRepository.find).not.toHaveBeenCalled();
    });

    it('acts on every idle lead it finds', async () => {
      automationsService.findActiveByTrigger.mockResolvedValue([
        makeAutomation({ trigger_type: 'lead_idle', trigger_config: { days: 3 } }),
      ]);
      leadRepository.find.mockResolvedValue([
        makeLead({ id: 'lead-1' }),
        makeLead({ id: 'lead-2' }),
      ]);

      await runner.scanIdleLeads();

      expect(whapiService.sendText).toHaveBeenCalledTimes(2);
    });
  });
});
