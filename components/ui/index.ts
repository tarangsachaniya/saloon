/** Barrel for the UI kit — `import { Button, Card } from "@/components/ui"`. */

export { Button, buttonClasses } from "./Button";
export type { ButtonProps, ButtonSize, ButtonVariant } from "./Button";

export { Input, Textarea } from "./Input";
export type { InputProps, TextareaProps } from "./Input";

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
} from "./Card";
export type { CardProps, EmptyStateProps } from "./Card";

export { LoadingRegion, Skeleton, SkeletonText } from "./Skeleton";

export { Loader, Spinner } from "./Spinner";
export type { LoaderProps, SpinnerProps, SpinnerSize } from "./Spinner";

export { APPOINTMENT_STATUS_META, Badge, StatusPill } from "./Badge";
export type { BadgeProps, BadgeTone, StatusPillProps } from "./Badge";

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";
export type { DialogContentProps } from "./Dialog";

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./Select";
export type { SelectOption, SelectProps } from "./Select";

export { Calendar, DatePicker, maxBookableDate } from "./DatePicker";
export type { CalendarProps, DatePickerProps } from "./DatePicker";

/* Added in M6 for the admin screens (no equivalent existed in the M4 kit). */

export { Toggle } from "./Toggle";
export type { ToggleProps } from "./Toggle";

export { TimeField } from "./TimeField";
export type { TimeFieldProps } from "./TimeField";

export {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "./Table";
export type { TableRowProps } from "./Table";
