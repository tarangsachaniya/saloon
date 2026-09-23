/** Barrel for the API layer — `import { getServices } from "@/lib/api"`. */

export {
  api,
  ApiError,
  isApiError,
  API_BASE_URL,
  get,
  post,
  patch,
  put,
  del,
} from "./client";
export type { RequestOptions, QueryParams } from "./client";

export { login, getMe } from "./auth";
export {
  getAvailability,
  selectBookableSlots,
} from "./availability";
export {
  createAppointment,
  getAdminAppointment,
  getAdminAppointments,
  updateAppointment,
  updateAppointmentStatus,
} from "./appointments";
export {
  createBarber,
  deleteBarber,
  getAdminBarber,
  getAdminBarbers,
  getBarber,
  getBarberAvailability,
  getBarbers,
  updateBarber,
} from "./barbers";
export { getClient, getClients } from "./clients";
export {
  createService,
  deleteService,
  getAdminService,
  getAdminServices,
  getService,
  getServices,
  updateService,
} from "./services";
export { getSettings, updateSettings } from "./settings";
export {
  normalizeAppointment,
  normalizeBarber,
  normalizeService,
  toDateOnly,
  toNumber,
} from "./normalize";
