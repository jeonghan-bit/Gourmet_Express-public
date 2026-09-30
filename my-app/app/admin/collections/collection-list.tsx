"use client";

import { useEffect, useState } from "react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Collection } from "./collection";
import { EditCollectionDialog } from "./edit-collection-dialog";
import type { SelectCollection } from "@/lib/types";
import { useCollectionActions } from "@/hooks/useCollectionActions";

interface CollectionListProps {
  collections: SelectCollection[];
}

export function CollectionList({
  collections: filteredCollections,
}: CollectionListProps) {
  const [editingCollection, setEditingCollection] =
    useState<SelectCollection | null>(null);
  const [localCollections, setLocalCollections] = useState(filteredCollections);
  const { editCollection, reorderCollections } = useCollectionActions();

  useEffect(() => {
    setLocalCollections(filteredCollections);
  }, [filteredCollections]);

  const displayCollections = localCollections;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const from = localCollections.find((c) => c.id === active.id);
    const to = localCollections.find((c) => c.id === over.id);
    if (!from || !to || from.status !== to.status) return;

    const oldIndex = localCollections.findIndex((c) => c.id === active.id);
    const newIndex = localCollections.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextCollections = arrayMove(localCollections, oldIndex, newIndex);
    setLocalCollections(nextCollections);

    const reorderedStatusGroup = nextCollections
      .filter((collection) => collection.status === from.status)
      .map(({ id }, index) => ({
        id,
        order: index + 1,
      }));

    try {
      await reorderCollections.mutateAsync(reorderedStatusGroup);
    } catch (error) {
      setLocalCollections(localCollections);
      console.error("Error reordering collections:", error);
    }
  }

  const handleEditClick = (collection: SelectCollection) => {
    setEditingCollection(collection);
  };

  const handleEditSave = async (newName: string) => {
    if (!editingCollection) return;
    const nextCollections = localCollections.map((collection) =>
      collection.id === editingCollection.id
        ? { ...collection, name: newName }
        : collection
    );
    setLocalCollections(nextCollections);
    setEditingCollection(null);

    try {
      await editCollection.mutateAsync({
        collectionId: editingCollection.id,
        data: { name: newName },
      });
    } catch (error) {
      setLocalCollections(localCollections);
      console.error("Error editing collection:", error);
    }
  };

  const handleStatusToggle = async (targetCollection: SelectCollection) => {
    const nextStatus: SelectCollection["status"] =
      targetCollection.status === "active" ? "inactive" : "active";
    const nextCollections = localCollections.map((collection) =>
      collection.id === targetCollection.id
        ? { ...collection, status: nextStatus }
        : collection
    );
    setLocalCollections(nextCollections);

    try {
      await editCollection.mutateAsync({
        collectionId: targetCollection.id,
        data: { status: nextStatus },
      });
    } catch (error) {
      setLocalCollections(localCollections);
      console.error("Error updating collection status:", error);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-muted-foreground">
        <div className="col-span-1">#</div>
        <div className="col-span-6">Name</div>
        <div className="col-span-3">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {displayCollections.length === 0 && (
        <div className="rounded-md border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
          No Collection Found
        </div>
      )}

      {displayCollections.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayCollections.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {displayCollections.map((collection, index) => (
              <Collection
                key={collection.id}
                collection={collection}
                displayOrder={index + 1}
                onEditClick={() => handleEditClick(collection)}
                onStatusToggle={() => handleStatusToggle(collection)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {editingCollection && (
        <EditCollectionDialog
          open={!!editingCollection}
          setOpen={() => setEditingCollection(null)}
          initialValue={editingCollection.name}
          onSave={handleEditSave}
          title="Edit Collection"
          buttonText="Save Changes"
        />
      )}
    </div>
  );
}
