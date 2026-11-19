import VisualMenuMatrix from "./VisualMenuMatrix";

interface WeeklyMenuConfigProps {
  campId: string;
  camps: any[];
  mealTypes: string[];
}

export default function WeeklyMenuConfig({ campId, camps, mealTypes }: WeeklyMenuConfigProps) {
  return <VisualMenuMatrix campId={campId} camps={camps} mealTypes={mealTypes} />;
}
