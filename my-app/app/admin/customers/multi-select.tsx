"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

interface MultiSelectProps {
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
}: MultiSelectProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);

  const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
      case "vip":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "blacklisted":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "regular":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "new":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "high value":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      case "frequent":
        return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      case "corporate":
        return "bg-pink-100 text-pink-800 hover:bg-pink-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUnselect = (option: string) => {
    onChange(selected.filter((s) => s !== option));
  };

  const handleSelect = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <Command 
    ref={containerRef} 
    className="overflow-visible bg-transparent  w-fit">
      <div
        onClick={() => setOpen(!open)}
        className="group border rounded-md px-3 py-2 text-sm cursor-pointer w-[180px] bg-background"
      >
        <div className="flex gap-1 flex-wrap items-center min-h-[1.75rem]">
          {selected.length === 0 ? (
            <span className="text-muted-foreground text-sm">All Tags</span>
          ) : (
            selected.map((option) => (
              <Badge
                key={option}
                variant="outline"
                className={`rounded-sm ${getTagColor(option)}`}
              >
                {option}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnselect(option);
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>

      {open && (
        <div className="relative mt-2 w-[180px]">
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto max-h-60">
              <CommandItem
                onSelect={() => onChange([])}
                className="cursor-pointer"
              >
                <div className="mr-2 w-4 h-4" />
                All
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className="cursor-pointer"
                >
                  <div
                    className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${
                      selected.includes(option.value)
                        ? "bg-blue-600 text-primary-foreground"
                        : "opacity-50"
                    }`}
                  >
                    {selected.includes(option.value) && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  {option.label}
                </CommandItem>
              ))}
              {options.length === 0 && (
                <p className="py-2 px-4 text-sm text-muted-foreground">
                  No options found.
                </p>
              )}
            </CommandGroup>
          </div>
        </div>
      )}
    </Command>
  );
}
