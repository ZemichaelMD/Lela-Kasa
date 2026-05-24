import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { Calendar } from "./eth-calendar";
import { formatEthiopianDate } from "../../lib/ethiopian-date-utils";
import { cn } from "../lib/cn";
import { useI18n } from "../../lib/i18n";

type EthiopianDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function EthiopianDateInput({
  value,
  onChange,
  className,
}: EthiopianDateInputProps) {
  const { lang } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [calMode, setCalMode] = React.useState<"ethiopian" | "gregorian">(
    lang === "am" ? "ethiopian" : "gregorian"
  );

  React.useEffect(() => {
    setCalMode(lang === "am" ? "ethiopian" : "gregorian");
  }, [lang]);

  const date = React.useMemo(() => {
    if (!value) return undefined;
    const d = parseISO(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  const handleSelect = (newDate: Date | undefined) => {
    if (newDate) {
      onChange(format(newDate, "yyyy-MM-dd"));
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          type="button"
          className={cn(
            "h-8 min-w-[160px] justify-start text-left font-normal pr-1.5",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 truncate text-xs">
            {date
              ? calMode === "ethiopian"
                ? formatEthiopianDate(date, "PPP")
                : format(date, "PP")
              : "Pick a date"}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setCalMode((prev) =>
                prev === "ethiopian" ? "gregorian" : "ethiopian"
              );
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                setCalMode((prev) =>
                  prev === "ethiopian" ? "gregorian" : "ethiopian"
                );
              }
            }}
            className="ml-1 shrink-0 rounded border border-border px-1 text-[10px] text-muted-foreground hover:bg-accent"
          >
            {calMode === "ethiopian" ? "ET" : "GR"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <Calendar
            key={`greg-${value}`}
            mode="single"
            required={false}
            selected={date}
            defaultMonth={date}
            onSelect={handleSelect}
            defaultDateLib="Gregorian"
            autoFocus
          />
          <Calendar
            key={`eth-${value}`}
            mode="single"
            required={false}
            selected={date}
            defaultMonth={date}
            onSelect={handleSelect}
            defaultDateLib="Ethiopian"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
