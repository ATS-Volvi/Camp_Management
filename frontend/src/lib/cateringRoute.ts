export const isCateringRoute = (pathname: string): boolean => {
  return (
    pathname.startsWith("/catering") ||
    pathname.startsWith("/mess-catering") ||
    pathname.startsWith("/grocery-inventory") ||
    pathname.startsWith("/meal-management") ||
    pathname.startsWith("/food-cancellation") ||
    pathname.startsWith("/department-lunch") ||
    pathname.startsWith("/cook-requests") ||
    pathname.startsWith("/food-safety") ||
    pathname.startsWith("/pantry-command-center")
  );
};
