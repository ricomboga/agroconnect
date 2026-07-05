export interface PushTemplate {
  title: string;
  body: string;
}

type TemplateData = Record<string, string>;

export const swPushTemplates: Record<string, (data: TemplateData) => PushTemplate> = {
  'farm.created': (d) => ({
    title: 'Shamba Limeandikishwa',
    body: `Shamba lako katika ${d['county'] ?? 'eneo lako'} limeandikishwa kwa mafanikio.`,
  }),
  'farm.activity.completed': (d) => ({
    title: 'Shughuli Imekamilika',
    body: `Shughuli ya ${d['activityType'] ?? 'kilimo'} imekamilika kwa mafanikio.`,
  }),
  'farm.harvest.recorded': (d) => ({
    title: 'Mavuno Yamerekodiwa',
    body: `Mavuno ya ${d['quantityKg'] ?? '?'} kg ya ${d['crop'] ?? 'mazao'} yamerekodiwa.`,
  }),
  'diagnosis.completed': (d) => ({
    title: 'Matokeo ya Uchunguzi Yako',
    body: `Ugonjwa uliogunduliwa: ${d['diseaseName'] ?? 'Angalia app kwa maelezo zaidi'}.`,
  }),
  'finance.loan.applied': (d) => ({
    title: 'Ombi la Mkopo Limepokelewa',
    body: `Ombi lako la mkopo wa KES ${d['amountKes'] ?? '?'} limepokelewa. Tutakujulisha hivi karibuni.`,
  }),
  'finance.loan.disbursed': (d) => ({
    title: 'Mkopo Umetumwa',
    body: `Mkopo wa KES ${d['amountKes'] ?? '?'} umetumwa kwenye nambari yako ya M-Pesa.`,
  }),
  'finance.payment.confirmed': (d) => ({
    title: 'Malipo Yamethibitishwa',
    body: `Malipo ya KES ${d['amountKes'] ?? '?'} yamethibitishwa kwa mafanikio.`,
  }),
  'finance.payment.failed': (d) => ({
    title: 'Malipo Yameshindwa',
    body: `Malipo ya KES ${d['amountKes'] ?? '?'} yameshindwa. ${d['reason'] ? `Sababu: ${d['reason']}` : 'Jaribu tena.'}`,
  }),
  'market.listing.created': (d) => ({
    title: 'Bidhaa Imeongezwa Sokoni',
    body: `${d['cropType'] ?? 'Mazao'} yako yameongezwa sokoni kwa KES ${d['pricePerKg'] ?? '?'}/kg.`,
  }),
  'market.order.placed': (d) => ({
    title: 'Agizo Jipya Limepokelewa',
    body: `Agizo jipya la ${d['cropType'] ?? 'bidhaa'} limepokelewa. Thamani: KES ${d['totalKes'] ?? '?'}.`,
  }),
  'market.order.updated': (d) => ({
    title: 'Hali ya Agizo Imebadilika',
    body: `Agizo lako sasa liko katika hali ya: ${d['status'] ?? 'imesasishwa'}.`,
  }),
  'govt.registration.submitted': (d) => ({
    title: 'Usajili wa Shamba Umewasilishwa',
    body: `Usajili wa ${d['farmName'] ?? 'shamba lako'} umewasilishwa kwa serikali.`,
  }),
  'weather.alert.issued': (d) => ({
    title: `Tahadhari ya Hali ya Hewa — ${d['severity'] ?? ''}`,
    body: d['description'] ?? 'Angalia hali ya hewa katika eneo lako.',
  }),
  'community.post.created': (d) => ({
    title: 'Chapisho Jipya Kwenye Jamii',
    body: `Chapisho jipya kwenye ${d['category'] ?? 'jamii'}: "${d['title'] ?? ''}".`,
  }),
  'community.reply.created': (d) => ({
    title: `${d['replierName'] ?? 'Mtu'} amejibu chapisho lako`,
    body: `"${d['threadTitle'] ?? 'chapisho lako'}" lina jibu jipya. Gonga kuona na kujibu.`,
  }),
  'user.registered': (d) => ({
    title: `Karibu AgroConnect, ${d['fullName'] ?? ''}!`,
    body: 'Akaunti yako imeundwa. Anza kusimamia shamba lako leo.',
  }),
  'farm.worker.assigned': (d) => ({
    title: `Umeongezwa kwenye ${d['farmName'] ?? 'shamba'}!`,
    body: `Jukumu lako: ${d['workerRole'] ?? 'mfanyakazi'}. Fungua AgroConnect kuona kazi zako.`,
  }),
  'notification.send': (d) => ({
    title: d['title'] ?? 'Ujumbe',
    body: d['body'] ?? '',
  }),
};
