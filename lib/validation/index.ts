export {
  createAppointmentSchema,
  customerDetailsSchema,
  customerNameSchema,
  dateStringSchema,
  fieldErrors,
  optionalEmailSchema,
  phoneSchema,
  timeStringSchema,
} from "./booking";
export type {
  CreateAppointmentInput,
  CustomerDetailsInput,
} from "./booking";

export {
  appointmentStatusSchema,
  barberFormSchema,
  bookingRulesSchema,
  loginSchema,
  salonProfileSchema,
  serviceFormSchema,
} from "./admin";
export type {
  BarberFormInput,
  BookingRulesInput,
  LoginInput,
  SalonProfileInput,
  ServiceFormInput,
} from "./admin";
