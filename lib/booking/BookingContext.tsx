"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ANY_BARBER } from "./types";
import type {
  Appointment,
  Barber,
  BarberSelection,
  DateString,
  Service,
  Slot,
} from "./types";

/**
 * In-progress booking wizard state.
 *
 * DESIGN DECISION (a deliberate departure from the legacy app): this is plain
 * React state — no Redux, no redux-persist, no localStorage. The old system
 * persisted a "cart" with a 5-minute reservation-hold timer; the new backend
 * has no hold concept (the slot is claimed atomically at POST time, which is
 * why `createAppointment` can fail with "slot no longer available"). So wizard
 * state only needs to survive between steps within one page session. A refresh
 * legitimately restarts the wizard, which also guarantees the customer sees
 * freshly-computed availability rather than stale slots.
 */

/** Steps of the customer booking wizard, in order. */
export const BOOKING_STEPS = [
  "service",
  "barber",
  "date",
  "slot",
  "details",
  "confirm",
] as const;

export type BookingStep = (typeof BOOKING_STEPS)[number];

/** Customer-entered contact details (validated by `lib/validation/booking.ts`). */
export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  notes: string;
  /** Required data-processing consent. Never pre-ticked. */
  consent: boolean;
  /** Separate, optional marketing opt-in. Never pre-ticked. */
  marketingOptIn: boolean;
}

const EMPTY_CUSTOMER: CustomerDetails = {
  name: "",
  phone: "",
  email: "",
  notes: "",
  consent: false,
  marketingOptIn: false,
};

export interface BookingState {
  service: Service | null;
  /** null = not chosen yet; ANY_BARBER = customer picked "Any Barber". */
  barber: Barber | null;
  isAnyBarber: boolean;
  /** "YYYY-MM-DD" */
  date: DateString | null;
  slot: Slot | null;
  customer: CustomerDetails;
  /** Set once the booking succeeds, for the confirmation screen. */
  confirmedAppointment: Appointment | null;
}

const INITIAL_STATE: BookingState = {
  service: null,
  barber: null,
  isAnyBarber: false,
  date: null,
  slot: null,
  customer: EMPTY_CUSTOMER,
  confirmedAppointment: null,
};

export interface BookingContextValue extends BookingState {
  /**
   * The value to send to the API as `barberId` — a concrete id, "any", or null
   * when the customer has not chosen yet.
   */
  barberSelection: BarberSelection | null;
  /** Steps whose required selection is already made. */
  completedSteps: Set<BookingStep>;
  /** The furthest step the customer may jump to right now. */
  canGoToStep: (step: BookingStep) => boolean;

  selectService: (service: Service) => void;
  selectBarber: (barber: Barber) => void;
  selectAnyBarber: () => void;
  selectDate: (date: DateString) => void;
  /** `null` clears a slot that turned out to be taken. */
  selectSlot: (slot: Slot | null) => void;
  setCustomer: (patch: Partial<CustomerDetails>) => void;
  setConfirmedAppointment: (appointment: Appointment | null) => void;
  /** Clear everything (e.g. "book another appointment"). */
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookingState>(INITIAL_STATE);

  /*
   * Each selection invalidates everything downstream of it — changing the
   * service changes durations (so slots differ), changing the barber or date
   * changes availability. Clearing eagerly prevents submitting a slot that was
   * computed for a different service/barber/date.
   */

  const selectService = useCallback((service: Service) => {
    setState((prev) =>
      prev.service?.id === service.id
        ? prev
        : {
            ...prev,
            service,
            barber: null,
            isAnyBarber: false,
            date: null,
            slot: null,
            confirmedAppointment: null,
          },
    );
  }, []);

  const selectBarber = useCallback((barber: Barber) => {
    setState((prev) =>
      prev.barber?.id === barber.id && !prev.isAnyBarber
        ? prev
        : { ...prev, barber, isAnyBarber: false, date: null, slot: null },
    );
  }, []);

  const selectAnyBarber = useCallback(() => {
    setState((prev) =>
      prev.isAnyBarber
        ? prev
        : { ...prev, barber: null, isAnyBarber: true, date: null, slot: null },
    );
  }, []);

  const selectDate = useCallback((date: DateString) => {
    setState((prev) =>
      prev.date === date ? prev : { ...prev, date, slot: null },
    );
  }, []);

  const selectSlot = useCallback((slot: Slot | null) => {
    setState((prev) => ({ ...prev, slot }));
  }, []);

  const setCustomer = useCallback((patch: Partial<CustomerDetails>) => {
    setState((prev) => ({ ...prev, customer: { ...prev.customer, ...patch } }));
  }, []);

  const setConfirmedAppointment = useCallback(
    (appointment: Appointment | null) => {
      setState((prev) => ({ ...prev, confirmedAppointment: appointment }));
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const barberSelection = useMemo<BarberSelection | null>(() => {
    if (state.isAnyBarber) return ANY_BARBER;
    return state.barber?.id ?? null;
  }, [state.isAnyBarber, state.barber]);

  const completedSteps = useMemo(() => {
    const done = new Set<BookingStep>();
    if (state.service) done.add("service");
    if (state.barber || state.isAnyBarber) done.add("barber");
    if (state.date) done.add("date");
    if (state.slot) done.add("slot");
    if (
      state.customer.name.trim() &&
      state.customer.phone.trim() &&
      state.customer.consent
    ) {
      done.add("details");
    }
    if (state.confirmedAppointment) done.add("confirm");
    return done;
  }, [state]);

  const canGoToStep = useCallback(
    (step: BookingStep) => {
      const index = BOOKING_STEPS.indexOf(step);
      if (index <= 0) return true;
      // Every preceding step must be complete.
      return BOOKING_STEPS.slice(0, index).every((prior) =>
        completedSteps.has(prior),
      );
    },
    [completedSteps],
  );

  const value = useMemo<BookingContextValue>(
    () => ({
      ...state,
      barberSelection,
      completedSteps,
      canGoToStep,
      selectService,
      selectBarber,
      selectAnyBarber,
      selectDate,
      selectSlot,
      setCustomer,
      setConfirmedAppointment,
      reset,
    }),
    [
      state,
      barberSelection,
      completedSteps,
      canGoToStep,
      selectService,
      selectBarber,
      selectAnyBarber,
      selectDate,
      selectSlot,
      setCustomer,
      setConfirmedAppointment,
      reset,
    ],
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

/** Access the booking wizard state. Must be used beneath `<BookingProvider>`. */
export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a <BookingProvider>.");
  }
  return context;
}
