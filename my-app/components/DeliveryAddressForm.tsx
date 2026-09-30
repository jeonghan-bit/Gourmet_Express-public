"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, Loader2, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { DeliveryAddressDetails } from "@/lib/types";

type Suggestion = { placeId: string; text: string };

const createAddressSessionToken = () => {
  const browserCrypto = globalThis.crypto;

  if (typeof browserCrypto?.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  if (typeof browserCrypto?.getRandomValues === "function") {
    const bytes = browserCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0")
    );
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
      .slice(6, 8)
      .join("")}-${hex.slice(8, 10).join("")}-${hex
      .slice(10)
      .join("")}`;
  }

  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}-${Math.random().toString(36).slice(2)}`;
};

type DeliveryAddressFormProps = {
  value: DeliveryAddressDetails | null;
  onChange: (value: DeliveryAddressDetails | null) => void;
  label?: string;
  required?: boolean;
};

export function DeliveryAddressForm({
  value,
  onChange,
  label = "Delivery Address",
  required = false,
}: DeliveryAddressFormProps) {
  const [isEditing, setIsEditing] = useState(!value);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState("");
  const [showInstructions, setShowInstructions] = useState(
    Boolean(value?.deliveryInstructions)
  );
  const sessionToken = useRef(createAddressSessionToken());
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId().replace(/:/g, "");

  useEffect(() => {
    if (!isSuggestionsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !autocompleteRef.current?.contains(event.target)
      ) {
        setIsSuggestionsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        autocompleteRef.current?.contains(document.activeElement)
      ) {
        // Intercept Escape before a parent dialog treats it as a request to close.
        event.preventDefault();
        event.stopPropagation();
        setIsSuggestionsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [isSuggestionsOpen]);

  useEffect(() => {
    const input = searchInputRef.current;
    if (!input) return;
    input.setCustomValidity(
      query.trim().length > 0 && !value
        ? "Please select an address from the suggestions."
        : ""
    );
  }, [query, value]);

  useEffect(() => {
    if (!isEditing || query.trim().length < 3) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setError("");
      try {
        const response = await fetch("/api/address/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: query,
            sessionToken: sessionToken.current,
          }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Address search failed");
        const nextSuggestions = data.suggestions ?? [];
        setSuggestions(nextSuggestions);
        setIsSuggestionsOpen(nextSuggestions.length > 0);
      } catch (searchError) {
        if ((searchError as Error).name !== "AbortError") {
          setError((searchError as Error).message);
          setSuggestions([]);
          setIsSuggestionsOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isEditing, query]);

  const selectSuggestion = async (suggestion: Suggestion) => {
    setIsSelecting(true);
    setError("");
    try {
      const response = await fetch("/api/address/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: suggestion.placeId,
          sessionToken: sessionToken.current,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Address verification failed");
      onChange(data.address);
      setQuery("");
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      setIsEditing(false);
      sessionToken.current = createAddressSessionToken();
    } catch (selectionError) {
      setError((selectionError as Error).message);
    } finally {
      setIsSelecting(false);
    }
  };

  const update = (changes: Partial<DeliveryAddressDetails>) => {
    if (value) onChange({ ...value, ...changes });
  };

  return (
    <div className="space-y-3">
      <Label htmlFor={`${fieldId}-search`}>
        {label}
        {required && (
          <>
            {" "}
            <span className="text-red-500">*</span>
          </>
        )}
      </Label>

      {value && !isEditing ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-5">{value.formattedAddress}</p>
              {value.addressType === "building" && value.unitNumber && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Apt/Unit {value.unitNumber}
                  {value.accessMethod === "buzzer" && value.buzzerCode
                    ? ` · Buzzer ${value.buzzerCode}`
                    : value.accessMethod === "call_on_arrival"
                      ? " · Call on arrival"
                      : value.accessMethod === "none"
                        ? " · No buzzer required"
                        : ""}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 px-2"
              onClick={() => {
                onChange(null);
                setIsEditing(true);
                setQuery("");
              }}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" /> Change
            </Button>
          </div>
        </div>
      ) : (
        <div ref={autocompleteRef} className="relative">
          <div className="relative">
            <Input
              ref={searchInputRef}
              id={`${fieldId}-search`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Start typing your address..."
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-controls={`${fieldId}-suggestions`}
              aria-expanded={isSuggestionsOpen && suggestions.length > 0}
              onFocus={() => {
                if (suggestions.length > 0) setIsSuggestionsOpen(true);
              }}
              disabled={isSelecting}
              required={required}
            />
            {(isSearching || isSelecting) && (
              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin" />
            )}
          </div>
          {isSuggestionsOpen && suggestions.length > 0 && (
            <div
              id={`${fieldId}-suggestions`}
              className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-lg"
              role="listbox"
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="flex w-full items-start gap-2 border-b px-3 py-3 text-left text-sm last:border-0 hover:bg-muted focus:bg-muted focus:outline-none"
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{suggestion.text}</span>
                </button>
              ))}
              <div className="flex justify-end px-3 py-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
                  alt="Powered by Google"
                  width="120"
                  height="14"
                />
              </div>
            </div>
          )}
          {query.length > 0 && query.length < 3 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Enter at least 3 characters, then select an address.
            </p>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {value && !isEditing && (
        <>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${fieldId}-building`}
              checked={value.addressType === "building"}
              onCheckedChange={(checked) =>
                update(
                  checked
                    ? { addressType: "building" }
                    : {
                        addressType: "house",
                        unitNumber: undefined,
                        accessMethod: undefined,
                        buzzerCode: undefined,
                      }
                )
              }
            />
            <Label htmlFor={`${fieldId}-building`} className="font-normal">
              This is an apartment, condo, or building
            </Label>
          </div>

          {value.addressType === "building" && (
            <div className="space-y-4 rounded-md border p-3">
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-unit`}>
                  Apartment or unit number{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`${fieldId}-unit`}
                  value={value.unitNumber ?? ""}
                  onChange={(event) => update({ unitNumber: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Building access <span className="text-red-500">*</span>
                </Label>
                <RadioGroup
                  value={value.accessMethod ?? ""}
                  onValueChange={(accessMethod) =>
                    update({
                      accessMethod: accessMethod as DeliveryAddressDetails["accessMethod"],
                      buzzerCode:
                        accessMethod === "buzzer" ? value.buzzerCode : undefined,
                    })
                  }
                  className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1"
                >
                  <div className="relative">
                    <RadioGroupItem
                      value="buzzer"
                      id={`${fieldId}-access-buzzer`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`${fieldId}-access-buzzer`}
                      className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full px-1 py-2 text-center text-[10px] font-medium leading-tight transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm sm:text-sm"
                    >
                      Buzzer code
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem
                      value="call_on_arrival"
                      id={`${fieldId}-access-call`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`${fieldId}-access-call`}
                      className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full px-1 py-2 text-center text-[10px] font-medium leading-tight transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm sm:text-sm"
                    >
                      Call on arrival
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem
                      value="none"
                      id={`${fieldId}-access-none`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`${fieldId}-access-none`}
                      className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full px-1 py-2 text-center text-[10px] font-medium leading-tight transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm sm:text-sm"
                    >
                      No buzzer required
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              {value.accessMethod === "buzzer" && (
                <div className="space-y-2">
                  <Label htmlFor={`${fieldId}-buzzer`}>
                    Buzzer code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`${fieldId}-buzzer`}
                    value={value.buzzerCode ?? ""}
                    onChange={(event) => update({ buzzerCode: event.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {!showInstructions ? (
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
              onClick={() => setShowInstructions(true)}
            >
              <span>Delivery instructions (optional)</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-instructions`}>Delivery instructions (optional)</Label>
              <Textarea
                id={`${fieldId}-instructions`}
                value={value.deliveryInstructions ?? ""}
                onChange={(event) => update({ deliveryInstructions: event.target.value })}
                placeholder="Entrance, parking, or drop-off instructions"
                maxLength={500}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
