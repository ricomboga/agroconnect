type TemplateData = Record<string, string>;

export const enSmsTemplates: Record<string, (data: TemplateData) => string> = {
  'farm.created': (d) =>
    `AgroConnect: Your farm in ${d['county'] ?? 'your area'} has been registered. Welcome!`,
  'farm.activity.completed': (d) =>
    `AgroConnect: Your ${d['activityType'] ?? 'farming'} activity has been completed.`,
  'farm.harvest.recorded': (d) =>
    `AgroConnect: ${d['quantityKg'] ?? '?'}kg of ${d['crop'] ?? 'produce'} harvest recorded.`,
  'diagnosis.completed': (d) =>
    `AgroConnect: Your diagnosis result is ready. Disease: ${d['diseaseName'] ?? 'Open app for details'}. Download the app for more.`,
  'finance.loan.applied': (d) =>
    `AgroConnect: Your loan application of KES ${d['amountKes'] ?? '?'} has been received. We will contact you soon.`,
  'finance.loan.disbursed': (d) =>
    `AgroConnect: KES ${d['amountKes'] ?? '?'} has been sent to your M-Pesa. Check your M-Pesa message for confirmation.`,
  'finance.payment.confirmed': (d) =>
    `AgroConnect: Payment of KES ${d['amountKes'] ?? '?'} confirmed. Thank you.`,
  'finance.payment.failed': (d) =>
    `AgroConnect: Payment of KES ${d['amountKes'] ?? '?'} failed. ${d['reason'] ? `Reason: ${d['reason']}.` : 'Please try again.'}`,
  'market.listing.created': (d) =>
    `AgroConnect: Your ${d['cropType'] ?? 'produce'} listing is live at KES ${d['pricePerKg'] ?? '?'}/kg.`,
  'market.order.placed': (d) =>
    `AgroConnect: New order for ${d['cropType'] ?? 'produce'} worth KES ${d['totalKes'] ?? '?'} received.`,
  'market.order.updated': (d) =>
    `AgroConnect: Your order status changed to: ${d['status'] ?? 'updated'}.`,
  'govt.registration.submitted': (d) =>
    `AgroConnect: Farm registration for ${d['farmName'] ?? 'your farm'} submitted to government.`,
  'weather.alert.issued': (d) =>
    `AgroConnect ALERT: ${d['description'] ?? 'Weather alert'} (${d['severity'] ?? ''}) in your area.`,
  'community.post.created': (d) =>
    `AgroConnect: New post in ${d['category'] ?? 'community'}: "${d['title'] ?? ''}".`,
  'user.registered': (d) =>
    `AgroConnect: Welcome ${d['fullName'] ?? ''}! Your account is ready. Download the app to get started.`,
  'notification.send': (d) => `AgroConnect: ${d['body'] ?? ''}`,
};
