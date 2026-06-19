type TemplateData = Record<string, string>;

export const swSmsTemplates: Record<string, (data: TemplateData) => string> = {
  'farm.created': (d) =>
    `AgroConnect: Shamba lako katika ${d['county'] ?? 'eneo lako'} limeandikishwa. Karibu!`,
  'farm.activity.completed': (d) =>
    `AgroConnect: Shughuli ya ${d['activityType'] ?? 'kilimo'} imekamilika kwenye shamba lako.`,
  'farm.harvest.recorded': (d) =>
    `AgroConnect: Mavuno ya ${d['quantityKg'] ?? '?'}kg ya ${d['crop'] ?? 'mazao'} yamerekodiwa.`,
  'diagnosis.completed': (d) =>
    `AgroConnect: Matokeo ya uchunguzi yako yako tayari. Ugonjwa: ${d['diseaseName'] ?? 'Angalia app'}. Pakua app kwa maelezo.`,
  'finance.loan.applied': (d) =>
    `AgroConnect: Ombi lako la mkopo wa KES ${d['amountKes'] ?? '?'} limepokelewa. Tutakupigia simu hivi karibuni.`,
  'finance.loan.disbursed': (d) =>
    `AgroConnect: Mkopo wa KES ${d['amountKes'] ?? '?'} umetumwa kwenye M-Pesa yako. Angalia ujumbe wa M-Pesa kwa uthibitisho.`,
  'finance.payment.confirmed': (d) =>
    `AgroConnect: Malipo ya KES ${d['amountKes'] ?? '?'} yamethibitishwa. Asante.`,
  'finance.payment.failed': (d) =>
    `AgroConnect: Malipo ya KES ${d['amountKes'] ?? '?'} yameshindwa. ${d['reason'] ? `Sababu: ${d['reason']}.` : 'Tafadhali jaribu tena.'}`,
  'market.listing.created': (d) =>
    `AgroConnect: ${d['cropType'] ?? 'Bidhaa'} yako imeongezwa sokoni kwa KES ${d['pricePerKg'] ?? '?'}/kg.`,
  'market.order.placed': (d) =>
    `AgroConnect: Agizo jipya la ${d['cropType'] ?? 'bidhaa'} (KES ${d['totalKes'] ?? '?'}) limepokelewa.`,
  'market.order.updated': (d) =>
    `AgroConnect: Hali ya agizo lako imebadilika: ${d['status'] ?? 'imesasishwa'}.`,
  'govt.registration.submitted': (d) =>
    `AgroConnect: Usajili wa ${d['farmName'] ?? 'shamba lako'} umewasilishwa kwa serikali.`,
  'weather.alert.issued': (d) =>
    `AgroConnect TAHADHARI: ${d['description'] ?? 'Tahadhari ya hali ya hewa'} (${d['severity'] ?? ''}) katika eneo lako.`,
  'community.post.created': (d) =>
    `AgroConnect: Chapisho jipya kwenye ${d['category'] ?? 'jamii'}: "${d['title'] ?? ''}".`,
  'user.registered': (d) =>
    `AgroConnect: Karibu ${d['fullName'] ?? ''}! Akaunti yako imeundwa. Pakua app kwa huduma zote.`,
  'notification.send': (d) => `AgroConnect: ${d['body'] ?? ''}`,
};
