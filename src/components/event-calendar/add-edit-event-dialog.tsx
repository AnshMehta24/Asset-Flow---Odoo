import { zodResolver } from "@hookform/resolvers/zod";
import { addMinutes, format, set } from "date-fns";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/event-calendar/date-time-picker";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/event-calendar/responsive-modal";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useCalendar } from "@/components/event-calendar/calendar-context";
import { useDisclosure } from "@/components/event-calendar/hooks";
import {
  bookingFormSchema,
  type IBookingEvent,
  type TBookingFormData,
} from "@/app/(with-auth)/resource-booking/_schema/booking-schema";
import { upsertBooking } from "@/app/(with-auth)/resource-booking/actions";

interface IProps {
  children: ReactNode;
  startDate?: Date;
  startTime?: { hour: number; minute: number };
  event?: IBookingEvent;
  departmentOptions?: { id: string; name: string }[];
}

export function AddEditEventDialog({
  children,
  startDate,
  startTime,
  event,
  departmentOptions = [],
}: IProps) {
  const { isOpen, onClose, onToggle } = useDisclosure();
  const { addEvent, updateEvent, resourceId } = useCalendar();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!event;

  const initialDates = useMemo(() => {
    if (!isEditing && !event) {
      if (!startDate) {
        const now = new Date();
        return { startDate: now, endDate: addMinutes(now, 30) };
      }
      const start = startTime
        ? set(new Date(startDate), {
            hours: startTime.hour,
            minutes: startTime.minute,
            seconds: 0,
          })
        : new Date(startDate);
      const end = addMinutes(start, 30);
      return { startDate: start, endDate: end };
    }

    return {
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
    };
  }, [startDate, startTime, event, isEditing]);

  const form = useForm<TBookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      assetId: event?.assetId ?? resourceId,
      purpose: event?.purpose ?? "",
      startDate: initialDates.startDate,
      endDate: initialDates.endDate,
      departmentId: event?.departmentId ?? undefined,
    },
  });

  useEffect(() => {
    form.reset({
      assetId: event?.assetId ?? resourceId,
      purpose: event?.purpose ?? "",
      startDate: initialDates.startDate,
      endDate: initialDates.endDate,
      departmentId: event?.departmentId ?? undefined,
    });
  }, [event, initialDates, resourceId, form]);

  const onSubmit = async (values: TBookingFormData) => {
    setIsSubmitting(true);

    try {
      const result = await upsertBooking({
        bookingId: isEditing ? event.bookingId : undefined,
        assetId: values.assetId,
        startDate: values.startDate,
        endDate: values.endDate,
        purpose: values.purpose,
        departmentId: values.departmentId || null,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      if (isEditing) {
        updateEvent(result.event);
        toast.success("Booking updated successfully");
      } else {
        addEvent(result.event);
        toast.success("Booking created successfully");
      }

      onClose();
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={onToggle} modal={false}>
      <ModalTrigger>{children}</ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{isEditing ? "Edit Booking" : "Book a Slot"}</ModalTitle>
          <ModalDescription>
            {isEditing
              ? "Reschedule or update this booking."
              : "Book this resource for a time slot."}
          </ModalDescription>
        </ModalHeader>

        <form
          id="event-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 py-4"
        >
          <FieldGroup>
            <Controller
              control={form.control}
              name="purpose"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Purpose</FieldLabel>
                  <Input
                    id={field.name}
                    placeholder="e.g. Sprint planning"
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="startDate"
              render={({ field, fieldState }) => (
                <DateTimePicker
                  form={form}
                  field={field}
                  error={fieldState.error}
                  invalid={fieldState.invalid}
                />
              )}
            />
            <Controller
              control={form.control}
              name="endDate"
              render={({ field, fieldState }) => (
                <DateTimePicker
                  form={form}
                  field={field}
                  error={fieldState.error}
                  invalid={fieldState.invalid}
                />
              )}
            />
            {departmentOptions.length > 0 && (
              <Controller
                control={form.control}
                name="departmentId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Book on behalf of department (optional)
                    </FieldLabel>
                    <NativeSelect
                      id={field.name}
                      name={field.name}
                      className="w-full"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    >
                      <NativeSelectOption value="">Just for me</NativeSelectOption>
                      {departmentOptions.map((department) => (
                        <NativeSelectOption value={department.id} key={department.id}>
                          {department.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            )}
          </FieldGroup>
        </form>
        <ModalFooter className="flex justify-end gap-2">
          <ModalClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </ModalClose>
          <Button form="event-form" type="submit" disabled={isSubmitting}>
            {isEditing ? "Save Changes" : "Book Resource"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
