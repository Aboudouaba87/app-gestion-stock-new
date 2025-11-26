"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/dashboard/components/ui/button";
import { Calendar } from "@/app/dashboard/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/dashboard/components/ui/popover";

interface DatePickerRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  onDateChange?: (
    startDate: Date | undefined,
    endDate: Date | undefined
  ) => void;
}

export function DatePickerRange({
  className,
  onDateChange,
}: DatePickerRangeProps) {
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    new Date(2024, 0, 1)
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    onDateChange?.(date, endDate);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    onDateChange?.(startDate, date);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Date de début */}
      <div className="flex-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? (
                startDate.toLocaleDateString("fr-FR")
              ) : (
                <span>Date début</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStartDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Date de fin */}
      <div className="flex-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? (
                endDate.toLocaleDateString("fr-FR")
              ) : (
                <span>Date fin</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={handleEndDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
