import { Suspense } from "react";
import CustomersPage from "./CustomersPage";

export default function CustomersPageWrapper() {
  return (
    <Suspense fallback={<div>Loading customers page...</div>}>
      <CustomersPage />
    </Suspense>
  );
}
