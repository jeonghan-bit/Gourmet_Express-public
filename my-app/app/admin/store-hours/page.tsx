"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStoreHours, useUpdateStoreHours } from "@/hooks/useStoreHours";
import { useTemporaryClosure } from "@/hooks/useTemporaryClosure";
import { AlertTriangle, Clock, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  buildClosureMessage,
  parseClosureMessage,
} from "@/lib/storefrontState";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function StoreHoursPage() {
  const { data: storeHours = [], isLoading, error } = useStoreHours();
  const updateStoreHours = useUpdateStoreHours();
  const {
    isClosed,
    closureMessage,
    isLoading: isClosureLoading,
    error: closureError,
    updateTemporaryClosure,
    isUpdating: isClosureUpdating,
  } = useTemporaryClosure();
  const [editingHours, setEditingHours] = useState<Record<string, any>>({});
  const [editingClosure, setEditingClosure] = useState({
    isClosed: false,
    reason: "",
    reopeningTime: "",
  });

  // Initialize editing state with current store hours
  useEffect(() => {
    if (storeHours.length > 0) {
      const initial = storeHours.reduce((acc, hours) => {
        acc[hours.dayOfWeek] = {
          openTime: hours.openTime,
          closeTime: hours.closeTime,
          isOpen: hours.isOpen,
        };
        return acc;
      }, {} as Record<string, any>);
      setEditingHours(initial);
    }
  }, [storeHours]);

  useEffect(() => {
    const templateValues = parseClosureMessage(closureMessage);
    setEditingClosure({
      isClosed,
      ...templateValues,
    });
  }, [isClosed, closureMessage]);

  const handleTimeChange = (
    day: string,
    field: "openTime" | "closeTime",
    value: string
  ) => {
    setEditingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleOpenToggle = (day: string, isOpen: boolean) => {
    setEditingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen,
      },
    }));
  };

  const handleSave = async (day: string) => {
    const hours = editingHours[day];
    if (!hours) return;

    try {
      await updateStoreHours.mutateAsync({
        dayOfWeek: day,
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        isOpen: hours.isOpen,
      });
      toast.success(`${day} hours updated successfully`);
    } catch (error) {
      toast.error(`Failed to update ${day} hours`);
    }
  };

  const handleSaveAll = async () => {
    const promises = Object.entries(editingHours).map(([day, hours]) =>
      updateStoreHours.mutateAsync({
        dayOfWeek: day,
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        isOpen: hours.isOpen,
      })
    );

    try {
      await Promise.all(promises);
      toast.success("All store hours updated successfully");
    } catch (error) {
      toast.error("Failed to update some store hours");
    }
  };

  const handleSaveClosure = async () => {
    const reason = editingClosure.reason.trim();
    const reopeningTime = editingClosure.reopeningTime.trim();
    if (editingClosure.isClosed && (!reason || !reopeningTime)) {
      toast.error("Add the closure reason and reopening time");
      return;
    }

    try {
      await updateTemporaryClosure({
        isClosed: editingClosure.isClosed,
        closureMessage: editingClosure.isClosed
          ? buildClosureMessage(reason, reopeningTime)
          : null,
      });
      toast.success(
        editingClosure.isClosed
          ? "Store temporarily closed"
          : "Temporary closure removed"
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update temporary closure"
      );
    }
  };

  if (isLoading || isClosureLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || closureError) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error loading store hours</p>
            <Button
              onClick={() => window.location.reload()}
              className="min-h-12 px-5"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Store Hours</h1>
          <p className="text-muted-foreground">
            Manage your store&apos;s opening and closing times
          </p>
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={updateStoreHours.isPending}
          className="min-h-12 px-5"
        >
          {updateStoreHours.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save All Changes
        </Button>
      </div>

      <div className="grid gap-4">
        <Card className={editingClosure.isClosed ? "border-red-300" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Temporary Closure
            </CardTitle>
            <CardDescription>
              Close the store immediately and tell customers why and when it
              will reopen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label
              htmlFor="temporary-closure-toggle"
              className="flex min-h-12 cursor-pointer items-center gap-3"
            >
              <Switch
                id="temporary-closure-toggle"
                checked={editingClosure.isClosed}
                onCheckedChange={(checked) =>
                  setEditingClosure((current) => ({
                    ...current,
                    isClosed: checked,
                    reason: checked ? current.reason : "",
                    reopeningTime: checked ? current.reopeningTime : "",
                  }))
                }
              />
              <span>{editingClosure.isClosed ? "Closed" : "Open"}</span>
            </Label>

            {editingClosure.isClosed && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="closure-reason">Closure Reason</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="text-sm text-muted-foreground">
                      We are temporarily closed because of
                    </span>
                    <Input
                      id="closure-reason"
                      value={editingClosure.reason}
                      onChange={(event) =>
                        setEditingClosure((current) => ({
                          ...current,
                          reason: event.target.value,
                        }))
                      }
                      maxLength={500}
                      className="h-12 flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reopening-time">Reopening Time</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="text-sm text-muted-foreground">
                      We expect to reopen at
                    </span>
                    <Input
                      id="reopening-time"
                      value={editingClosure.reopeningTime}
                      onChange={(event) =>
                        setEditingClosure((current) => ({
                          ...current,
                          reopeningTime: event.target.value,
                        }))
                      }
                      maxLength={250}
                      className="h-12 flex-1"
                    />
                  </div>
                </div>

                {editingClosure.reason.trim() &&
                  editingClosure.reopeningTime.trim() && (
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-sm font-medium">Popup preview</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {buildClosureMessage(
                          editingClosure.reason,
                          editingClosure.reopeningTime
                        )}
                      </p>
                    </div>
                  )}
              </div>
            )}

            <Button
              onClick={handleSaveClosure}
              disabled={
                isClosureUpdating ||
                (editingClosure.isClosed &&
                  (!editingClosure.reason.trim() ||
                    !editingClosure.reopeningTime.trim()))
              }
              className="min-h-12 px-5"
            >
              {isClosureUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Temporary Closure
            </Button>
          </CardContent>
        </Card>

        {DAYS_OF_WEEK.map((day) => {
          const currentHours = storeHours.find((h) => h.dayOfWeek === day);
          const editing = editingHours[day] || {
            openTime: currentHours?.openTime || "09:00",
            closeTime: currentHours?.closeTime || "17:00",
            isOpen: currentHours?.isOpen ?? true,
          };

          return (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {day}
                </CardTitle>
                <CardDescription>
                  Set opening and closing times for {day}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor={`${day}-open`}>Opening Time</Label>
                    <Input
                      className="h-12"
                      id={`${day}-open`}
                      type="time"
                      value={editing.openTime}
                      onChange={(e) =>
                        handleTimeChange(day, "openTime", e.target.value)
                      }
                      disabled={!editing.isOpen}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${day}-close`}>Closing Time</Label>
                    <Input
                      className="h-12"
                      id={`${day}-close`}
                      type="time"
                      value={editing.closeTime}
                      onChange={(e) =>
                        handleTimeChange(day, "closeTime", e.target.value)
                      }
                      disabled={!editing.isOpen}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Label htmlFor={`${day}-open-toggle`}>Open</Label>
                      <Label
                        htmlFor={`${day}-open-toggle`}
                        className="flex min-h-12 cursor-pointer items-center space-x-2"
                      >
                        <Switch
                          id={`${day}-open-toggle`}
                          checked={editing.isOpen}
                          onCheckedChange={(checked) =>
                            handleOpenToggle(day, checked)
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {editing.isOpen ? "Open" : "Closed"}
                        </span>
                      </Label>
                    </div>

                    <Button
                      onClick={() => handleSave(day)}
                      disabled={updateStoreHours.isPending}
                      size="sm"
                      className="ml-4 min-h-12 px-5"
                    >
                      {updateStoreHours.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </div>

                {editing.isOpen && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      {day}: {editing.openTime} - {editing.closeTime}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
