// Simula a interface adaptada do calendário do Google

export interface GoogleEventParams {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}
 
export interface GoogleEventResponse {
  id: string;
  htmlLink: string;
}
 
export class GoogleCalendarAPI {
  async createEvent(params: GoogleEventParams): Promise<GoogleEventResponse> {
    // Simulação — em produção chamaria a API REST do Google Calendar
    console.log(`[GoogleCalendar] createEvent: "${params.summary}"`);
    console.log(`  start=${params.start.dateTime}  end=${params.end.dateTime}`);
    return {
      id: `gcal-${Date.now()}`,
      htmlLink: `https://calendar.google.com/event?eid=simulado`,
    };
  }
 
  async deleteEvent(googleEventId: string): Promise<void> {
    // Simulação
    console.log(`[GoogleCalendar] deleteEvent: ${googleEventId}`);
  }
}
