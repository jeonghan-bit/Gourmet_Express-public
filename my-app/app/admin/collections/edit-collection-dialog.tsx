"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface EditCollectionDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  initialValue?: string
  onSave: (name: string) => void
  title: string
  buttonText: string
}

export function EditCollectionDialog({
  open,
  setOpen,
  initialValue = "",
  onSave,
  title,
  buttonText,
}: EditCollectionDialogProps) {
  const [name, setName] = useState(initialValue)

  useEffect(() => {
    if (open) {
      setName(initialValue)
    }
  }, [open, initialValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSave(name)
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[425px] [&>button]:h-12 [&>button]:w-12">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Enter the collection name below. Click save when you&apos;re done.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                autoFocus
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-h-12">
              Cancel
            </Button>
            <Button type="submit" className="min-h-12">{buttonText}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
