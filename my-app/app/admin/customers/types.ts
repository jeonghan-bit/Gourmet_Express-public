export interface Customer {
  userId: number;
  phoneNumber: string | null;
  email: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  postalCode: string | null;
  allergyInfo: string | null;
  memo: string | null;
  tags: string[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface CustomerTableProps {
  customers: Customer[];
  availableTags: Tag[];
  onAddMemo: (userId: number, memo: string) => Promise<void>;
  onUpdateTags: (userId: number, tagIds: number[]) => Promise<void>;
  onAddTag: (name: string) => Promise<void>;
}

export interface AddCustomerDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  availableTags: Tag[];
}
