export interface WorkCalendar {
  /** Days of the week that are working days (0=Sun, 1=Mon, …, 6=Sat) */
  workingDays: number[];
  /** ISO date strings (YYYY-MM-DD) that are non-working holidays */
  holidays: string[];
  /** ISO date strings that are exceptions (working despite being weekend) */
  workingExceptions: string[];
}

/** Russian production calendar defaults: Mon–Fri, no holidays pre-loaded */
export const DEFAULT_CALENDAR: WorkCalendar = {
  workingDays: [1, 2, 3, 4, 5],
  holidays: [],
  workingExceptions: [],
};

export type DateConstraintType =
  | 'SNET' // Start No Earlier Than
  | 'SNLT' // Start No Later Than
  | 'FNET' // Finish No Earlier Than
  | 'FNLT' // Finish No Later Than
  | 'MSO'  // Must Start On
  | 'MFO'; // Must Finish On

export interface DateConstraint {
  type: DateConstraintType;
  date: Date;
}
