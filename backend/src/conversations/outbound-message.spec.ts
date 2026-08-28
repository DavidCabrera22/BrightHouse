import { ConversationsService } from './conversations.service';
import { TenantContext, TenantScopeService } from '../common/tenant';
import { LeadsService } from '../leads/leads.service';
import { TenantsService } from '../tenants/tenants.service';
import { WhapiService } from '../webhooks/whapi.service';
import { InstagramService } from '../webhooks/instagram.service';

const ctx: TenantContext = { tenantId: 'tenant-alpes', isSuperAdmin: false } as TenantContext;

const WHATSAPP_CONV = {
  id: 'conv-1',
  channel: 'whatsapp',
  contact_phone: '573001112233',
  whatsapp_waid: '573001112233',
  tenant_id: 'tenant-alpes',
  unread_count: 0,
  nova_paused: false,
};

const TENANT = {
  id: 'tenant-alpes',
  whapi_token: 'token-alpes',
  instagram_token: 'ig-token',
  instagram_account_id: 'ig-page',
};

function build(conv: any = WHATSAPP_CONV, tenant: any = TENANT) {
  const conversationRepo = {
    findOne: jest.fn(async () => ({ ...conv })),
    update: jest.fn(async () => undefined),
  };
  const messageRepo = {
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn(async (d: any) => ({ id: 'msg-1', ...d })),
  };
  const tenantScope = { assertAccess: jest.fn() };
  const leadsService = {};
  const tenantsService = { findByIdOrNull: jest.fn(async () => tenant) };
  const whapi = { sendText: jest.fn(async () => true) };
  const instagram = { sendText: jest.fn(async () => true) };

  const service = new ConversationsService(
    conversationRepo as any,
    messageRepo as any,
    tenantScope as unknown as TenantScopeService,
    leadsService as unknown as LeadsService,
    tenantsService as unknown as TenantsService,
    whapi as unknown as WhapiService,
    instagram as unknown as InstagramService,
  );

  return { service, conversationRepo, messageRepo, tenantsService, whapi, instagram };
}

const agentMessage = { content: 'Buenas, le confirmo la cita', sender_type: 'agent', sender_name: 'Asesor' };

describe('Mensajes escritos desde la bandeja del CRM', () => {
  it('los entrega por WhatsApp con el token del tenant', async () => {
    const { service, whapi, messageRepo } = build();

    await service.addMessageForTenant('conv-1', agentMessage as any, ctx);

    expect(whapi.sendText).toHaveBeenCalledWith(
      '573001112233',
      'Buenas, le confirmo la cita',
      'token-alpes',
    );
    expect(messageRepo.save).toHaveBeenCalled();
  });

  it('NO guarda el mensaje si la entrega falla', async () => {
    // Guardarlo igual deja al asesor creyendo que el cliente lo leyó, cuando
    // en su WhatsApp no llegó nada.
    const { service, whapi, messageRepo } = build();
    whapi.sendText.mockResolvedValue(false as never);

    await expect(
      service.addMessageForTenant('conv-1', agentMessage as any, ctx),
    ).rejects.toThrow(/no se pudo entregar/i);

    expect(messageRepo.save).not.toHaveBeenCalled();
  });

  it('sale por el Graph API cuando la conversación es de Instagram', async () => {
    const { service, instagram, whapi } = build({
      ...WHATSAPP_CONV,
      channel: 'instagram',
      contact_phone: 'ig-psid-9',
      whatsapp_waid: null,
    });

    await service.addMessageForTenant('conv-1', agentMessage as any, ctx);

    expect(instagram.sendText).toHaveBeenCalledWith(
      'ig-psid-9',
      'Buenas, le confirmo la cita',
      'ig-token',
      'ig-page',
    );
    expect(whapi.sendText).not.toHaveBeenCalled();
  });

  it('un canal sin salida se guarda igual, sin intentar enviar', async () => {
    const { service, whapi, instagram, messageRepo } = build({
      ...WHATSAPP_CONV,
      channel: 'webchat',
    });

    await service.addMessageForTenant('conv-1', agentMessage as any, ctx);

    expect(whapi.sendText).not.toHaveBeenCalled();
    expect(instagram.sendText).not.toHaveBeenCalled();
    expect(messageRepo.save).toHaveBeenCalled();
  });

  it('no reenvía lo que no escribió un asesor: Nova ya entregó lo suyo', async () => {
    const { service, whapi, messageRepo } = build();

    await service.addMessageForTenant(
      'conv-1',
      { content: 'respuesta de Nova', sender_type: 'bot', sender_name: 'Nova' } as any,
      ctx,
    );

    expect(whapi.sendText).not.toHaveBeenCalled();
    expect(messageRepo.save).toHaveBeenCalled();
  });

  it('sin tenant en la conversación deja que el servicio use el token del entorno', async () => {
    const { service, whapi } = build({ ...WHATSAPP_CONV, tenant_id: null }, null);

    await service.addMessageForTenant('conv-1', agentMessage as any, ctx);

    expect(whapi.sendText).toHaveBeenCalledWith(
      '573001112233',
      'Buenas, le confirmo la cita',
      undefined,
    );
  });

  it('una conversación sin destinatario no se puede entregar y no se guarda', async () => {
    const { service, messageRepo } = build({
      ...WHATSAPP_CONV,
      contact_phone: null,
      whatsapp_waid: null,
    });

    await expect(
      service.addMessageForTenant('conv-1', agentMessage as any, ctx),
    ).rejects.toThrow();

    expect(messageRepo.save).not.toHaveBeenCalled();
  });
});
