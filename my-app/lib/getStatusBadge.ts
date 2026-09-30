export function getStatusBadge(status: string): string {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "ready":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      // case "on delivery":
      //   return "bg-indigo-100 text-indigo-800 hover:bg-indigo-200";
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "canceled":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
}
