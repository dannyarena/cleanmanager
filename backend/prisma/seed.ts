import { PrismaClient, UserRole, RecurrenceFrequency, ExceptionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniziando il seeding del database...');

  // Pulisci il database
  await prisma.shiftException.deleteMany();
  await prisma.checkItem.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.shiftOperator.deleteMany();
  await prisma.shiftSite.deleteMany();
  await prisma.shiftRecurrence.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.site.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // Crea tenant demo
  const tenant = await prisma.tenant.create({
    data: {
      name: 'CleanManager Demo S.r.l.',
    },
  });

  console.log('✅ Tenant creato:', tenant.name);

  // Hash password per tutti gli utenti
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Crea utenti demo
  const admin = await prisma.user.create({
    data: {
      email: 'admin@cleanmanager.demo',
      password: hashedPassword,
      firstName: 'Mario',
      lastName: 'Rossi',
      role: UserRole.ADMIN,
      isManager: false,
      tenantId: tenant.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@cleanmanager.demo',
      password: hashedPassword,
      firstName: 'Giulia',
      lastName: 'Bianchi',
      role: UserRole.OPERATORE,
      isManager: true,
      tenantId: tenant.id,
    },
  });

  const operatore1 = await prisma.user.create({
    data: {
      email: 'operatore1@cleanmanager.demo',
      password: hashedPassword,
      firstName: 'Luca',
      lastName: 'Verdi',
      role: UserRole.OPERATORE,
      isManager: false,
      tenantId: tenant.id,
    },
  });

  const operatore2 = await prisma.user.create({
    data: {
      email: 'operatore2@cleanmanager.demo',
      password: hashedPassword,
      firstName: 'Anna',
      lastName: 'Neri',
      role: UserRole.OPERATORE,
      isManager: false,
      tenantId: tenant.id,
    },
  });

  console.log('✅ Utenti creati: Admin, Manager, 2 Operatori');

  // Crea clienti demo
  const cliente1 = await prisma.client.create({
    data: {
      name: 'Hotel Bella Vista',
      email: 'info@hotelbellavista.it',
      phone: '+39 02 1234567',
      address: 'Via Roma 123, 20100 Milano',
      tenantId: tenant.id,
    },
  });

  const cliente2 = await prisma.client.create({
    data: {
      name: 'Uffici Centro Business',
      email: 'amministrazione@centrobusiness.it',
      phone: '+39 02 7654321',
      address: 'Corso Buenos Aires 45, 20124 Milano',
      tenantId: tenant.id,
    },
  });

  const cliente3 = await prisma.client.create({
    data: {
      name: 'Residenza San Marco',
      email: 'portineria@residenzasanmarco.it',
      phone: '+39 02 9876543',
      address: 'Piazza San Marco 8, 20121 Milano',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Clienti creati: 3 clienti aziendali');

  // Crea siti demo
  const sito1 = await prisma.site.create({
    data: {
      name: 'Hotel Bella Vista - Piano Terra',
      address: 'Via Roma 123, 20100 Milano - Piano Terra',
      clientId: cliente1.id,
      tenantId: tenant.id,
    },
  });

  const sito2 = await prisma.site.create({
    data: {
      name: 'Hotel Bella Vista - Camere',
      address: 'Via Roma 123, 20100 Milano - Piani 1-3',
      clientId: cliente1.id,
      tenantId: tenant.id,
    },
  });

  const sito3 = await prisma.site.create({
    data: {
      name: 'Centro Business - Uffici',
      address: 'Corso Buenos Aires 45, 20124 Milano - Uffici',
      clientId: cliente2.id,
      tenantId: tenant.id,
    },
  });

  const sito4 = await prisma.site.create({
    data: {
      name: 'Centro Business - Aree Comuni',
      address: 'Corso Buenos Aires 45, 20124 Milano - Aree Comuni',
      clientId: cliente2.id,
      tenantId: tenant.id,
    },
  });

  const sito5 = await prisma.site.create({
    data: {
      name: 'Residenza San Marco - Appartamenti',
      address: 'Piazza San Marco 8, 20121 Milano - Appartamenti',
      clientId: cliente3.id,
      tenantId: tenant.id,
    },
  });

  const sito6 = await prisma.site.create({
    data: {
      name: 'Residenza San Marco - Cortile',
      address: 'Piazza San Marco 8, 20121 Milano - Cortile e Giardino',
      clientId: cliente3.id,
      tenantId: tenant.id,
    },
  });

  console.log('✅ Siti creati: 6 siti distribuiti tra i clienti');

  // Crea turni demo
  const oggi = new Date();
  const domani = new Date(oggi);
  domani.setDate(oggi.getDate() + 1);

  // Turno singolo
  const turno1 = await prisma.shift.create({
    data: {
      title: 'Pulizia Straordinaria Hotel',
      date: oggi,
      notes: 'Pulizia approfondita per evento speciale',
      tenantId: tenant.id,
    },
  });

  // Turno ricorrente giornaliero
  const turno2 = await prisma.shift.create({
    data: {
      title: 'Pulizia Quotidiana Uffici',
      date: oggi,
      notes: 'Pulizia standard uffici',
      tenantId: tenant.id,
    },
  });

  await prisma.shiftRecurrence.create({
    data: {
      shiftId: turno2.id,
      frequency: RecurrenceFrequency.DAILY,
      interval: 1,
      startDate: oggi,
      endDate: new Date(oggi.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 giorni
    },
  });

  // Turno ricorrente settimanale
  const turno3 = await prisma.shift.create({
    data: {
      title: 'Pulizia Settimanale Residenza',
      date: oggi,
      notes: 'Pulizia approfondita settimanale',
      tenantId: tenant.id,
    },
  });

  await prisma.shiftRecurrence.create({
    data: {
      shiftId: turno3.id,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 1,
      startDate: oggi,
      count: 12, // 12 settimane
    },
  });

  // Altri turni
  const turno4 = await prisma.shift.create({
    data: {
      title: 'Sanificazione Aree Comuni',
      date: domani,
      notes: 'Sanificazione completa',
      tenantId: tenant.id,
    },
  });

  const turno5 = await prisma.shift.create({
    data: {
      title: 'Pulizia Vetri Hotel',
      date: new Date(oggi.getTime() + 2 * 24 * 60 * 60 * 1000),
      notes: 'Pulizia vetri esterni e interni',
      tenantId: tenant.id,
    },
  });

  const turno6 = await prisma.shift.create({
    data: {
      title: 'Manutenzione Giardino',
      date: new Date(oggi.getTime() + 3 * 24 * 60 * 60 * 1000),
      notes: 'Cura del verde e pulizia cortile',
      tenantId: tenant.id,
    },
  });

  // === SERIE DIMOSTRATIVE PER MILESTONE 8 ===
  
  // Serie daily con eccezioni MODIFIED e CANCELLED
  const serieDailyDemo = await prisma.shift.create({
    data: {
      title: 'Serie Daily Demo - Pulizia Quotidiana',
      date: oggi,
      notes: 'Serie dimostrativa per test con eccezioni',
      tenantId: tenant.id,
    },
  });

  await prisma.shiftRecurrence.create({
    data: {
      shiftId: serieDailyDemo.id,
      frequency: RecurrenceFrequency.DAILY,
      interval: 1,
      startDate: oggi,
      endDate: new Date(oggi.getTime() + 21 * 24 * 60 * 60 * 1000), // 21 giorni
    },
  });

  // Serie weekly interval=2 per test this_and_future
  const serieWeeklyDemo = await prisma.shift.create({
    data: {
      title: 'Serie Weekly Demo - Pulizia Bisettimanale',
      date: oggi,
      notes: 'Serie dimostrativa per test split this_and_future',
      tenantId: tenant.id,
    },
  });

  await prisma.shiftRecurrence.create({
    data: {
      shiftId: serieWeeklyDemo.id,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 2, // ogni 2 settimane
      startDate: oggi,
      count: 8, // 8 occorrenze (16 settimane)
    },
  });

  console.log('✅ Turni creati: 8 turni con ricorrenze daily/weekly + 2 serie demo');

  // Assegna siti ai turni
  await prisma.shiftSite.createMany({
    data: [
      { shiftId: turno1.id, siteId: sito1.id },
      { shiftId: turno1.id, siteId: sito2.id },
      { shiftId: turno2.id, siteId: sito3.id },
      { shiftId: turno2.id, siteId: sito4.id },
      { shiftId: turno3.id, siteId: sito5.id },
      { shiftId: turno3.id, siteId: sito6.id },
      { shiftId: turno4.id, siteId: sito4.id },
      { shiftId: turno5.id, siteId: sito1.id },
      { shiftId: turno6.id, siteId: sito6.id },
      // Serie demo
      { shiftId: serieDailyDemo.id, siteId: sito1.id },
      { shiftId: serieDailyDemo.id, siteId: sito3.id },
      { shiftId: serieWeeklyDemo.id, siteId: sito2.id },
      { shiftId: serieWeeklyDemo.id, siteId: sito5.id },
    ],
  });

  // Assegna operatori ai turni
  await prisma.shiftOperator.createMany({
    data: [
      { shiftId: turno1.id, userId: operatore1.id },
      { shiftId: turno1.id, userId: operatore2.id },
      { shiftId: turno2.id, userId: operatore1.id },
      { shiftId: turno3.id, userId: operatore2.id },
      { shiftId: turno4.id, userId: manager.id },
      { shiftId: turno5.id, userId: operatore1.id },
      { shiftId: turno6.id, userId: operatore2.id },
      // Serie demo
      { shiftId: serieDailyDemo.id, userId: operatore1.id },
      { shiftId: serieWeeklyDemo.id, userId: operatore2.id },
      { shiftId: serieWeeklyDemo.id, userId: manager.id },
    ],
  });

  console.log('✅ Assegnazioni create: siti e operatori assegnati ai turni');

  // Crea checklist per ogni sito
  const checklist1 = await prisma.checklist.create({
    data: {
      title: 'Checklist Hotel Piano Terra',
      siteId: sito1.id,
      tenantId: tenant.id,
    },
  });

  await prisma.checkItem.createMany({
    data: [
      { title: 'Pulizia reception', description: 'Pulire banco reception e area accoglienza', order: 1, checklistId: checklist1.id },
      { title: 'Aspirazione tappeti', description: 'Aspirare tutti i tappeti della hall', order: 2, checklistId: checklist1.id },
      { title: 'Pulizia bagni pubblici', description: 'Sanificare bagni pubblici', order: 3, checklistId: checklist1.id },
      { title: 'Svuotamento cestini', description: 'Svuotare tutti i cestini', order: 4, checklistId: checklist1.id },
    ],
  });

  const checklist2 = await prisma.checklist.create({
    data: {
      title: 'Checklist Camere Hotel',
      siteId: sito2.id,
      tenantId: tenant.id,
    },
  });

  await prisma.checkItem.createMany({
    data: [
      { title: 'Rifare letti', description: 'Cambiare lenzuola e rifare letti', order: 1, checklistId: checklist2.id },
      { title: 'Pulizia bagni camere', description: 'Pulire e sanificare bagni', order: 2, checklistId: checklist2.id },
      { title: 'Aspirazione pavimenti', description: 'Aspirare moquette e pavimenti', order: 3, checklistId: checklist2.id },
      { title: 'Rifornimento amenities', description: 'Controllare e rifornire amenities', order: 4, checklistId: checklist2.id },
    ],
  });

  const checklist3 = await prisma.checklist.create({
    data: {
      title: 'Checklist Uffici Centro Business',
      siteId: sito3.id,
      tenantId: tenant.id,
    },
  });

  await prisma.checkItem.createMany({
    data: [
      { title: 'Pulizia scrivanie', description: 'Pulire e disinfettare tutte le scrivanie', order: 1, checklistId: checklist3.id },
      { title: 'Aspirazione pavimenti', description: 'Aspirare moquette uffici', order: 2, checklistId: checklist3.id },
      { title: 'Svuotamento cestini', description: 'Svuotare cestini carta e raccolta differenziata', order: 3, checklistId: checklist3.id },
      { title: 'Pulizia vetri interni', description: 'Pulire vetri divisori e finestre', order: 4, checklistId: checklist3.id },
    ],
  });

  const checklist4 = await prisma.checklist.create({
    data: {
      title: 'Checklist Aree Comuni Centro Business',
      siteId: sito4.id,
      tenantId: tenant.id,
    },
  });

  await prisma.checkItem.createMany({
    data: [
      { title: 'Pulizia sala riunioni', description: 'Pulire tavoli e sedie sala riunioni', order: 1, checklistId: checklist4.id },
      { title: 'Pulizia cucina', description: 'Pulire cucina e area break', order: 2, checklistId: checklist4.id },
      { title: 'Pulizia corridoi', description: 'Lavare pavimenti corridoi', order: 3, checklistId: checklist4.id },
      { title: 'Pulizia ascensore', description: 'Pulire interno ascensore', order: 4, checklistId: checklist4.id },
    ],
  });

  const checklist5 = await prisma.checklist.create({
    data: {
      title: 'Checklist Appartamenti Residenza',
      siteId: sito5.id,
      tenantId: tenant.id,
    },
  });

  await prisma.checkItem.createMany({
    data: [
      { title: 'Pulizia scale condominiali', description: 'Lavare scale e pianerottoli', order: 1, checklistId: checklist5.id },
      { title: 'Pulizia ascensore', description: 'Pulire e sanificare ascensore', order: 2, checklistId: checklist5.id },
      { title: 'Pulizia atrio', description: 'Pulire atrio e zona mailbox', order: 3, checklistId: checklist5.id },
      { title: 'Controllo illuminazione', description: 'Verificare funzionamento luci comuni', order: 4, checklistId: checklist5.id },
    ],
  });

  const checklist6 = await prisma.checklist.create({
    data: {
      title: 'Checklist Cortile e Giardino',
      siteId: sito6.id,
      tenantId: tenant.id,
    },
  });

  await prisma.checkItem.createMany({
    data: [
      { title: 'Spazzamento cortile', description: 'Spazzare tutto il cortile', order: 1, checklistId: checklist6.id },
      { title: 'Cura del verde', description: 'Innaffiare piante e potare se necessario', order: 2, checklistId: checklist6.id },
      { title: 'Pulizia fontana', description: 'Pulire fontana e area circostante', order: 3, checklistId: checklist6.id },
      { title: 'Raccolta foglie', description: 'Raccogliere foglie secche', order: 4, checklistId: checklist6.id },
    ],
  });

  console.log('✅ Checklist create: 6 checklist con 4 voci ciascuna');

  // Crea alcune eccezioni per dimostrare la funzionalità
  await prisma.shiftException.create({
    data: {
      shiftId: turno2.id,
      date: new Date(oggi.getTime() + 7 * 24 * 60 * 60 * 1000), // tra una settimana
      exceptionType: ExceptionType.CANCELLED,
    },
  });

  await prisma.shiftException.create({
    data: {
      shiftId: turno3.id,
      date: new Date(oggi.getTime() + 14 * 24 * 60 * 60 * 1000), // tra due settimane
      exceptionType: ExceptionType.MODIFIED,
      newTitle: 'Pulizia Straordinaria Residenza',
      newNotes: 'Pulizia extra per ispezione condominiale',
    },
  });

  // === ECCEZIONI PER SERIE DEMO ===
  
  // Eccezione MODIFIED per serie daily demo (giorno 3)
  await prisma.shiftException.create({
    data: {
      shiftId: serieDailyDemo.id,
      date: new Date(oggi.getTime() + 3 * 24 * 60 * 60 * 1000),
      exceptionType: ExceptionType.MODIFIED,
      newTitle: 'Serie Daily Demo - Pulizia Speciale',
      newNotes: 'Modifica per test: pulizia con prodotti speciali',
    },
  });

  // Eccezione CANCELLED per serie daily demo (giorno 7)
  await prisma.shiftException.create({
    data: {
      shiftId: serieDailyDemo.id,
      date: new Date(oggi.getTime() + 7 * 24 * 60 * 60 * 1000),
      exceptionType: ExceptionType.CANCELLED,
    },
  });

  console.log('✅ Eccezioni create: 4 eccezioni per dimostrare la funzionalità (incluse serie demo)');

  console.log('\n🎉 Seeding completato con successo!');
  console.log('\n📊 Riepilogo dati creati:');
  console.log(`   • 1 Tenant: ${tenant.name}`);
  console.log(`   • 4 Utenti: 1 Admin, 1 Manager, 2 Operatori`);
  console.log(`   • 3 Clienti aziendali`);
  console.log(`   • 6 Siti distribuiti tra i clienti`);
  console.log(`   • 8 Turni (6 base + 2 serie demo con ricorrenze)`);
  console.log(`   • 6 Checklist con 4 voci ciascuna`);
  console.log(`   • 4 Eccezioni (2 base + 2 per serie demo: MODIFIED e CANCELLED)`);
  console.log('\n🔑 Credenziali di accesso:');
  console.log('   Admin: admin@cleanmanager.demo / password123');
  console.log('   Manager: manager@cleanmanager.demo / password123');
  console.log('   Operatore 1: operatore1@cleanmanager.demo / password123');
  console.log('   Operatore 2: operatore2@cleanmanager.demo / password123');
}

main()
  .catch((e) => {
    console.error('❌ Errore durante il seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });