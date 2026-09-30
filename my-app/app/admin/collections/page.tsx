"use client";

import { useState, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CollectionList } from "./collection-list";
import { EditCollectionDialog } from "./edit-collection-dialog";
import LoadingAnimation from "@/components/LoadingAnimation";
import { StatusFilter } from "@/components/ui/status-filter";
import { useCollectionActions } from "@/hooks/useCollectionActions";

// Mock data for the UI template

// Component that uses useSearchParams
function CollectionsContent() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const {
    useCollections,
    createCollection,
  } = useCollectionActions();

  const { data: collections = [], isLoading, error } = useCollections();

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];
  const filteredCollections =
    statusFilter === "all"
      ? collections
      : collections.filter((collection) => collection.status === statusFilter);

  const handleAdd = async (name: string) => {
    try {
      await createCollection.mutateAsync({
        name,
        status: "active",
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding collection:", error);
    }
  };

  if (isLoading) {
    return <LoadingAnimation className="h-screen" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">
          Error: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Collections</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="min-h-12"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Collection
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Management</CardTitle>
          <CardDescription>
            Organize your products into collections and manage their visibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <StatusFilter
              currentStatus={statusFilter}
              statusOptions={statusOptions}
              onStatusChange={setStatusFilter}
            />
          </div>
          <CollectionList
            collections={filteredCollections}
          />
        </CardContent>
      </Card>

      {isAddDialogOpen && (
        <EditCollectionDialog
          open={isAddDialogOpen}
          setOpen={setIsAddDialogOpen}
          onSave={handleAdd}
          title="Add Collection"
          buttonText="Create Collection"
        />
      )}
    </div>
  );
}

// Main page component with Suspense boundary
export default function CollectionsPage() {
  return (
    <Suspense fallback={<LoadingAnimation className="h-screen" />}>
      <CollectionsContent />
    </Suspense>
  );
}
