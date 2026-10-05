// PLACEHOLDER DATA. Shown only when the API cannot be reached.
// Real content is managed in the Django admin.
const d = (days, h = 10) => {
  const x = new Date(); x.setDate(x.getDate() + days); x.setHours(h, 0, 0, 0); return x.toISOString();
};
export const SAMPLE = {
  events: [
    { id: 1, title: "Policy and Governance Panel Discussion", description: "Students, faculty and practitioners discuss how policy moves from idea to implementation.", starts_at: d(14, 14), location: "Kenyatta University", category: "academic", registration_url: "" },
    { id: 2, title: "Annual General Meeting", description: "Review of the year and election of the next executive.", starts_at: d(35, 9), location: "KU Main Campus", category: "campus", registration_url: "" },
    { id: 3, title: "Youth and Policy Webinar", description: "An open online discussion on how young people can shape public policy.", starts_at: d(60, 20), location: "Google Meet", category: "webinar", registration_url: "https://meet.google.com" },
    { id: 4, title: "Past event example", description: "Past events stay in the archive.", starts_at: d(-40, 10), location: "Kenyatta University", category: "international", registration_url: "" },
  ],
  briefs: [
    { id: 1, title: "Youth participation in county policy making", summary: "How county governments can open the policy cycle to young people.", topic: "youth", author: "KUSOPPA Policy Team", reading_minutes: 5, pdf: "" },
    { id: 2, title: "Digital tools for citizen engagement", summary: "What works when public participation moves online.", topic: "technology", author: "KUSOPPA Policy Team", reading_minutes: 6, pdf: "" },
    { id: 3, title: "Making devolved funds easier to track", summary: "Practical reporting reforms that help citizens follow the money.", topic: "devolution", author: "KUSOPPA Policy Team", reading_minutes: 7, pdf: "" },
  ],
  board: [
    { id: 1, name: "Derrick Odhiambo", role: "Chairperson", photo: "", is_current: true },
    { id: 2, name: "To be announced", role: "Vice Chairperson", photo: "", is_current: true },
    { id: 3, name: "To be announced", role: "Secretary General", photo: "", is_current: true },
    { id: 4, name: "To be announced", role: "Treasurer", photo: "", is_current: true },
  ],
};
