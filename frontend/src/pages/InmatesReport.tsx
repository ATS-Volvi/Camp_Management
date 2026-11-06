import CampInmatesTab from "@/components/camp/CampInmatesTab";

export default function InmatesReport() {
  return (
    <div className="p-4 md:p-6 space-y-5 min-w-0">
      <h1 className="text-2xl font-bold">Inmates Report</h1>
      <CampInmatesTab />
    </div>
  );
}