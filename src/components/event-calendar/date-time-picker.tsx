import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { FieldError as RHFFieldError } from "react-hook-form";
import type { ControllerRenderProps, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCalendar } from "@/components/event-calendar/calendar-context";
import type { TBookingFormData } from "@/app/(with-auth)/resource-booking/_schema/booking-schema";

interface DatePickerProps {
  form: UseFormReturn<TBookingFormData>;
  field: ControllerRenderProps<TBookingFormData, "endDate" | "startDate">;
  error?: RHFFieldError;
  invalid?: boolean;
}

export function DateTimePicker({
  form,
  field,
  error,
  invalid,
}: DatePickerProps) {
  const { use24HourFormat } = useCalendar();

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      form.setValue(field.name, date);
    }
  }

  function handleTimeChange(type: "hour" | "minute" | "ampm", value: string) {
    const currentDate = form.getValues(field.name) || new Date();
    const newDate = new Date(currentDate);

    if (type === "hour") {
      newDate.setHours(parseInt(value, 10));
    } else if (type === "minute") {
      newDate.setMinutes(parseInt(value, 10));
    } else if (type === "ampm") {
      const hours = newDate.getHours();
      if (value === "AM" && hours >= 12) {
        newDate.setHours(hours - 12);
      } else if (value === "PM" && hours < 12) {
        newDate.setHours(hours + 12);
      }
    }

    form.setValue(field.name, newDate);
  }

  return (
    <Field className="flex flex-col" data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>
        {field.name === "startDate" ? "Start Date" : "End Date"}
      </FieldLabel>
      <Popover modal={true}>
        <PopoverTrigger
          render={
            <Button
              id={field.name}
              type="button"
              variant="outline"
              aria-invalid={invalid}
              className={cn(
                "w-full pl-3 text-left font-normal",
                !field.value && "text-muted-foreground"
              )}
            >
              {field.value ? (
                format(
                  field.value,
                  use24HourFormat ? "MM/dd/yyyy HH:mm" : "MM/dd/yyyy hh:mm aa"
                )
              ) : (
                <span>MM/DD/YYYY hh:mm aa</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0">
          <div className="sm:flex">
            <Calendar
              mode="single"
              selected={field.value}
              onSelect={handleDateSelect}
            />
            <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex sm:flex-col p-2">
                  {Array.from(
                    { length: use24HourFormat ? 24 : 12 },
                    (_, i) => i,
                  ).map((hour) => (
                    <Button
                      key={hour}
                      size="icon"
                      variant={
                        field.value &&
                        field.value.getHours() % (use24HourFormat ? 24 : 12) ===
                          hour % (use24HourFormat ? 24 : 12)
                          ? "default"
                          : "ghost"
                      }
                      className="sm:w-full shrink-0 aspect-square"
                      onClick={() => handleTimeChange("hour", hour.toString())}
                    >
                      {hour.toString().padStart(2, "0")}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex sm:flex-col p-2">
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                    <Button
                      key={minute}
                      size="icon"
                      variant={
                        field.value && field.value.getMinutes() === minute
                          ? "default"
                          : "ghost"
                      }
                      className="sm:w-full shrink-0 aspect-square"
                      onClick={() =>
                        handleTimeChange("minute", minute.toString())
                      }
                    >
                      {minute.toString().padStart(2, "0")}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <FieldError errors={error ? [error] : undefined} />
    </Field>
  );
}


