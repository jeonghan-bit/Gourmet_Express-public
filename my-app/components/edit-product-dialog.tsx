"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import * as z from "zod";
import { updateProductSchema } from "@/lib/schemas";
import FileUpload from "@/components/FileUpload";
import { useCollectionActions } from "@/hooks/useCollectionActions";
import {
  ProductOptionType,
  useOptionTypes,
  useProductActions,
  useProductOptionTypeIds,
} from "@/hooks/useProductActions";
import {
  GripVertical,
  PlusCircle,
  Settings,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ProductFormValues = z.infer<typeof updateProductSchema>;

type ConfirmationState = {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
};

type Collection = {
  id: number;
  name: string;
  status: string;
  order: number;
};

type EditProductDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  existingProduct: any;
};

export function EditProductDialog({
  open,
  setOpen,
  existingProduct,
}: EditProductDialogProps) {
  const [isImageUploading, setIsImageUploading] = useState(false);
  const { useCollections } = useCollectionActions();
  const { data: collections = [] } = useCollections();

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isImageUploading) return;
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:max-w-[720px] sm:p-6 [&>button]:min-h-12 [&>button]:min-w-12"
        onEscapeKeyDown={(event) => {
          if (isImageUploading) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isImageUploading) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update product details here.</DialogDescription>
        </DialogHeader>
        <EditProductForm
          existingProduct={existingProduct}
          onClose={() => setOpen(false)}
          collections={collections}
          isImageUploading={isImageUploading}
          onImageUploadingChange={setIsImageUploading}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditProductForm({
  existingProduct,
  onClose,
  collections,
  isImageUploading,
  onImageUploadingChange,
}: {
  existingProduct: any;
  onClose: () => void;
  collections: Collection[];
  isImageUploading: boolean;
  onImageUploadingChange: (uploading: boolean) => void;
}) {
  const [statusMessage, setStatusMessage] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });
  const [selectedOptionTypeIds, setSelectedOptionTypeIds] = useState<string[]>(
    []
  );
  const {
    deleteProduct,
    editProduct,
    editProductOptions,
  } = useProductActions();
  const { data: productOptionTypeIds, isLoading: productOptionsLoading } =
    useProductOptionTypeIds(existingProduct.id);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: {
      name: existingProduct.name,
      price: existingProduct.price?.toString() ?? "0",
      description: existingProduct.description ?? "",
      image_url: existingProduct.image_url ?? "",
      // inventory: existingProduct.inventory,
      status: existingProduct.status as "active" | "inactive",
      collection_id: existingProduct.collection?.id,
    },
  });

  useEffect(() => {
    if (!productOptionTypeIds) return;

    setSelectedOptionTypeIds(productOptionTypeIds);
  }, [productOptionTypeIds]);

  async function onSubmit(data: ProductFormValues) {
    setStatusMessage("Updating product");
    try {
      await editProduct.mutateAsync({
        productId: existingProduct.id,
        data,
      });
      await editProductOptions.mutateAsync({
        productId: existingProduct.id,
        optionTypeIds: selectedOptionTypeIds,
      });

      form.reset();
      onClose();
      setStatusMessage("Product updated successfully");
      setTimeout(() => {
        setStatusMessage("");
      }, 2000);
    } catch (error) {
      console.error(error);
      setStatusMessage("Error updating product");
    }
  }

  function confirmDeleteProduct() {
    setConfirmation({
      open: true,
      title: "Delete Product",
      description: `Delete "${existingProduct.name}"? This removes the product and its option assignments.`,
      onConfirm: async () => {
        setStatusMessage("Deleting product");
        await deleteProduct.mutateAsync({ productId: existingProduct.id });
        setConfirmation((current) => ({ ...current, open: false }));
        onClose();
      },
    });
  }

  return (
    <Form {...form}>
      {statusMessage && (
        <p className="mb-4 text-sm text-green-600">{statusMessage}</p>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price *</FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Product description"
                  {...field}
                  value={field.value ?? ""} // Ensure value is always a string
                  onChange={(e) => field.onChange(e.target.value || "")}
                />
              </FormControl>
              <FormDescription>
                Provide a detailed description of your product.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="image_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Image</FormLabel>
                <FileUpload
                  onUpload={(url: string) => {
                    field.onChange(url);
                  }}
                  onUploadingChange={onImageUploadingChange}
                />
                <FormDescription>
                  Upload an image of the product.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* <FormField
            control={form.control}
            name="inventory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inventory *</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>Number of items in stock.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          /> */}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Set the product visibility status.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="collection_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Collection *</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a collection" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {collections.map((collection) => (
                      <SelectItem
                        key={collection.id}
                        value={collection.id.toString()}
                      >
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the collection for this product
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <ProductOptionsEditor
          selectedOptionTypeIds={selectedOptionTypeIds}
          setSelectedOptionTypeIds={setSelectedOptionTypeIds}
          isLoading={productOptionsLoading}
        />
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={confirmDeleteProduct}
            disabled={isImageUploading || deleteProduct.isPending}
            className="min-h-12"
          >
            <Trash2 className="h-4 w-4" />
            Delete Product
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isImageUploading}
              className="min-h-12"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isImageUploading || editProduct.isPending}
              className="min-h-12"
            >
              {isImageUploading ? "Uploading image..." : "Confirm"}
            </Button>
          </div>
        </DialogFooter>
      </form>
      <ConfirmationDialog
        confirmation={confirmation}
        setConfirmation={setConfirmation}
      />
    </Form>
  );
}

export function ProductOptionsEditor({
  selectedOptionTypeIds,
  setSelectedOptionTypeIds,
  isLoading = false,
}: {
  selectedOptionTypeIds: string[];
  setSelectedOptionTypeIds: Dispatch<SetStateAction<string[]>>;
  isLoading?: boolean;
}) {
  const [optionPickerOpen, setOptionPickerOpen] = useState(false);
  const [editingOptionTypeId, setEditingOptionTypeId] = useState<string | null>(
    null
  );
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionRequired, setNewOptionRequired] = useState(true);
  const { createOptionType } = useProductActions();
  const { data: optionTypes = [], isLoading: optionTypesLoading } =
    useOptionTypes();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function addOptionType(optionTypeId: string) {
    setSelectedOptionTypeIds((current) =>
      current.includes(optionTypeId) ? current : [...current, optionTypeId]
    );
    setOptionPickerOpen(false);
  }

  function removeOptionType(optionTypeId: string) {
    setSelectedOptionTypeIds((current) =>
      current.filter((id) => id !== optionTypeId)
    );
    if (editingOptionTypeId === optionTypeId) {
      setEditingOptionTypeId(null);
    }
  }

  function confirmRemoveOptionType(optionType: ProductOptionType) {
    setConfirmation({
      open: true,
      title: "Remove Option",
      description: `Remove "${optionType.name}" from this product? The option type itself will not be deleted.`,
      onConfirm: () => {
        removeOptionType(optionType.id);
        setConfirmation((current) => ({ ...current, open: false }));
      },
    });
  }

  async function createAndAddOptionType() {
    const name = newOptionName.trim();
    if (!name) return;

    const result = await createOptionType.mutateAsync({
      name,
      required: newOptionRequired,
    });

    if (result.optionType?.id) {
      addOptionType(result.optionType.id);
    }

    setNewOptionName("");
    setNewOptionRequired(true);
  }

  function handleOptionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSelectedOptionTypeIds((current) => {
      const oldIndex = current.findIndex((id) => id === active.id);
      const newIndex = current.findIndex((id) => id === over.id);
      if (oldIndex === -1 || newIndex === -1) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  const selectedOptionTypes = selectedOptionTypeIds
    .map((id) => optionTypes.find((optionType) => optionType.id === id))
    .filter((optionType): optionType is ProductOptionType =>
      Boolean(optionType)
    );

  const availableOptionTypes = optionTypes.filter(
    (optionType) => !selectedOptionTypeIds.includes(optionType.id)
  );

  const editingOptionType =
    optionTypes.find((optionType) => optionType.id === editingOptionTypeId) ??
    null;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <FormLabel>Options</FormLabel>
          <FormDescription>
            Select the option groups available for this product.
          </FormDescription>
        </div>
        <Dialog open={optionPickerOpen} onOpenChange={setOptionPickerOpen}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOptionPickerOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Add
          </Button>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[560px] [&>button]:min-h-12 [&>button]:min-w-12">
            <DialogHeader>
              <DialogTitle>Add Option</DialogTitle>
              <DialogDescription>
                Attach an option group to this product.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {availableOptionTypes.length > 0 ? (
                availableOptionTypes.map((optionType) => (
                  <button
                    key={optionType.id}
                    type="button"
                    className="rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                    onClick={() => addOptionType(optionType.id)}
                  >
                    <span className="block font-medium">{optionType.name}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {formatItemPreview(optionType.items, 6)}
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  No more option groups.
                </div>
              )}
            </div>
            <div className="grid gap-3 rounded-md border p-3">
              <div className="font-medium">Create New Option Type</div>
              <Input
                value={newOptionName}
                onChange={(event) => setNewOptionName(event.target.value)}
                placeholder="Option type name"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newOptionRequired}
                  onChange={(event) => setNewOptionRequired(event.target.checked)}
                />
                Required
              </label>
              <Button type="button" variant="outline" onClick={createAndAddOptionType}>
                <PlusCircle className="h-4 w-4" />
                Create Option Type
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {optionTypesLoading || isLoading ? (
        <div className="rounded-md border p-4 text-sm text-muted-foreground">
          Loading options...
        </div>
      ) : selectedOptionTypes.length > 0 ? (
        <div className="grid gap-3 rounded-md border p-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleOptionDragEnd}
          >
            <SortableContext
              items={selectedOptionTypeIds}
              strategy={verticalListSortingStrategy}
            >
              {selectedOptionTypes.map((optionType) => (
                <SortableProductOptionRow
                  key={optionType.id}
                  optionType={optionType}
                  onDetails={() => setEditingOptionTypeId(optionType.id)}
                  onRemove={() => confirmRemoveOptionType(optionType)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="rounded-md border p-4 text-sm text-muted-foreground">
          No options added.
        </div>
      )}
      <OptionDetailsDialog
        open={Boolean(editingOptionType)}
        optionType={editingOptionType}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingOptionTypeId(null);
        }}
        onOptionTypeDeleted={(optionTypeId) => {
          removeOptionType(optionTypeId);
          setEditingOptionTypeId(null);
        }}
      />
      <ConfirmationDialog
        confirmation={confirmation}
        setConfirmation={setConfirmation}
      />
    </div>
  );
}

function formatItemPreview(
  items: ProductOptionType["items"],
  limit: number
) {
  const preview = items
    .slice(0, limit)
    .map((item) => item.label)
    .join(", ");
  const hiddenItemCount = Math.max(items.length - limit, 0);
  return `${preview || "No items"}${hiddenItemCount > 0 ? ` +${hiddenItemCount} more` : ""}`;
}

function SortableProductOptionRow({
  optionType,
  onDetails,
  onRemove,
}: {
  optionType: ProductOptionType;
  onDetails: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: optionType.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-center"
    >
      <button
        type="button"
        className="flex h-9 w-8 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
        <span className="sr-only">Drag to reorder</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{optionType.name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {optionType.required ? "Required" : "Optional"}
          </span>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {formatItemPreview(optionType.items, 4)}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDetails}>
          <Settings className="h-4 w-4" />
          Details
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
    </div>
  );
}

type OptionItemDraft = {
  id: string;
  label: string;
  additionalPrice: string;
};

function OptionDetailsDialog({
  open,
  optionType,
  onOpenChange,
  onOptionTypeDeleted,
}: {
  open: boolean;
  optionType: ProductOptionType | null;
  onOpenChange: (open: boolean) => void;
  onOptionTypeDeleted: (optionTypeId: string) => void;
}) {
  const [items, setItems] = useState<OptionItemDraft[]>([]);
  const [optionName, setOptionName] = useState("");
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("0");
  const [required, setRequired] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });
  const {
    createOptionItem,
    deleteOptionItem,
    deleteOptionType,
    editOptionItems,
    reorderOptionItems,
    updateOptionType,
  } = useProductActions();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!optionType) return;

    setItems(
      optionType.items.map((item) => ({
        id: item.id,
        label: item.label,
        additionalPrice: item.additionalPrice,
      }))
    );
    setOptionName(optionType.name);
    setNewItemLabel("");
    setNewItemPrice("0");
    setRequired(optionType.required);
    setStatusMessage("");
    setConfirmation((current) => ({ ...current, open: false }));
  }, [optionType]);

  if (!optionType) return null;
  const activeOptionType = optionType;

  function updateItemDraft(
    itemId: string,
    key: "label" | "additionalPrice",
    value: string
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, [key]: value } : item
      )
    );
  }

  async function addItem() {
    const label = newItemLabel.trim();
    if (!label) return;

    setStatusMessage("Adding item...");
    const result = await createOptionItem.mutateAsync({
      optionTypeId: activeOptionType.id,
      label,
      additionalPrice: newItemPrice || "0",
    });

    if (result.item) {
      setItems((current) => [...current, result.item]);
    }

    setNewItemLabel("");
    setNewItemPrice("0");
    setStatusMessage("Item added");
  }

  async function removeItem(itemId: string) {
    setStatusMessage("Removing item...");
    await deleteOptionItem.mutateAsync({
      optionTypeId: activeOptionType.id,
      itemId,
    });
    setItems((current) => current.filter((item) => item.id !== itemId));
    setStatusMessage("Item removed");
  }

  function confirmRemoveItem(item: OptionItemDraft) {
    setConfirmation({
      open: true,
      title: "Delete Option Item",
      description: `Delete "${item.label}" from this option type?`,
      onConfirm: async () => {
        await removeItem(item.id);
        setConfirmation((current) => ({ ...current, open: false }));
      },
    });
  }

  function confirmDeleteOptionType() {
    setConfirmation({
      open: true,
      title: "Delete Option Type",
      description: `Delete "${activeOptionType.name}" and all of its items? This also removes it from products.`,
      onConfirm: async () => {
        setStatusMessage("Deleting option type...");
        await deleteOptionType.mutateAsync({
          optionTypeId: activeOptionType.id,
        });
        setConfirmation((current) => ({ ...current, open: false }));
        onOptionTypeDeleted(activeOptionType.id);
        onOpenChange(false);
      },
    });
  }

  async function saveAllAndClose() {
    const validItems = items
      .map((item) => ({
        itemId: item.id,
        label: item.label.trim(),
        additionalPrice: item.additionalPrice || "0",
      }))
      .filter((item) => item.label);

    const trimmedOptionName = optionName.trim();
    if (!trimmedOptionName) {
      setStatusMessage("Option name is required");
      return;
    }

    if (
      required !== activeOptionType.required ||
      trimmedOptionName !== activeOptionType.name
    ) {
      setStatusMessage("Saving option settings...");
      await updateOptionType.mutateAsync({
        optionTypeId: activeOptionType.id,
        name: trimmedOptionName,
        required,
      });
    }

    if (validItems.length > 0) {
      setStatusMessage("Saving items...");
      await editOptionItems.mutateAsync({
        optionTypeId: activeOptionType.id,
        items: validItems,
      });
    }

    setStatusMessage("");
    onOpenChange(false);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedItems = arrayMove(items, oldIndex, newIndex);
    setItems(reorderedItems);

    try {
      await reorderOptionItems.mutateAsync({
        optionTypeId: activeOptionType.id,
        items: reorderedItems.map((item, index) => ({
          id: item.id,
          order: index + 1,
        })),
      });
      setStatusMessage("Order saved");
    } catch (error) {
      setItems(items);
      setStatusMessage("Add option_items.sort_order before saving order");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[760px] [&>button]:min-h-12 [&>button]:min-w-12">
        <DialogHeader>
          <DialogTitle>{activeOptionType.name}</DialogTitle>
          <DialogDescription>
            Edit the option name, item labels, and additional prices.
          </DialogDescription>
        </DialogHeader>
        {statusMessage && (
          <p className="text-sm text-green-600">{statusMessage}</p>
        )}
        <div className="grid gap-2 rounded-md border p-3">
          <Label htmlFor="option-type-name">Option Name</Label>
          <Input
            id="option-type-name"
            value={optionName}
            onChange={(event) => setOptionName(event.target.value)}
            placeholder="Option name"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div>
            <div className="font-medium">Required Option</div>
            <div className="text-sm text-muted-foreground">
              Customers must select an item from this option type.
            </div>
          </div>
          <Switch
            checked={required}
            onCheckedChange={setRequired}
            disabled={updateOptionType.isPending}
            aria-label="Toggle required option"
          />
        </div>
        <div className="grid gap-3">
          <div className="hidden gap-3 px-3 text-xs font-medium uppercase text-muted-foreground md:grid md:grid-cols-[32px_1fr_140px_auto]">
            <span />
            <span>Item</span>
            <span>Additional Price</span>
            <span>Actions</span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableOptionItemRow
                  key={item.id}
                  item={item}
                  updateItemDraft={updateItemDraft}
                  removeItem={confirmRemoveItem}
                />
              ))}
            </SortableContext>
          </DndContext>
          <div className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_140px_auto]">
            <Input
              value={newItemLabel}
              onChange={(event) => setNewItemLabel(event.target.value)}
              placeholder="New item"
            />
            <Input
              inputMode="decimal"
              value={newItemPrice}
              onChange={(event) => setNewItemPrice(event.target.value)}
              placeholder="0.00"
            />
            <Button type="button" variant="outline" onClick={addItem}>
              <PlusCircle className="h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={confirmDeleteOptionType}
            className="min-h-12"
          >
            Delete Option Type
          </Button>
          <Button type="button" onClick={saveAllAndClose} className="min-h-12">
            Done
          </Button>
        </DialogFooter>
        <ConfirmationDialog
          confirmation={confirmation}
          setConfirmation={setConfirmation}
        />
      </DialogContent>
    </Dialog>
  );
}

function SortableOptionItemRow({
  item,
  updateItemDraft,
  removeItem,
}: {
  item: OptionItemDraft;
  updateItemDraft: (
    itemId: string,
    key: "label" | "additionalPrice",
    value: string
  ) => void;
  removeItem: (item: OptionItemDraft) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[32px_1fr_140px_auto]"
    >
      <button
        type="button"
        className="flex h-9 w-8 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
        <span className="sr-only">Drag to reorder</span>
      </button>
      <Input
        value={item.label}
        onChange={(event) =>
          updateItemDraft(item.id, "label", event.target.value)
        }
        placeholder="Item name"
      />
      <Input
        inputMode="decimal"
        value={item.additionalPrice}
        onChange={(event) =>
          updateItemDraft(item.id, "additionalPrice", event.target.value)
        }
        placeholder="0.00"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeItem(item)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
}

function ConfirmationDialog({
  confirmation,
  setConfirmation,
}: {
  confirmation: ConfirmationState;
  setConfirmation: Dispatch<SetStateAction<ConfirmationState>>;
}) {
  return (
    <Dialog
      open={confirmation.open}
      onOpenChange={(open) =>
        setConfirmation((current) => ({ ...current, open }))
      }
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto [&>button]:h-12 [&>button]:w-12">
        <DialogHeader>
          <DialogTitle>{confirmation.title}</DialogTitle>
          <DialogDescription>{confirmation.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setConfirmation((current) => ({ ...current, open: false }))
            }
            className="min-h-12"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => confirmation.onConfirm()}
            className="min-h-12"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
