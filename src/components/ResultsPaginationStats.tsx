import { ViewType } from "@/types/ViewType";

interface Props {
  total: number;
  groups: number;
  groupedBy: ViewType;
}

export function ResultsPaginationStats({ total, groups, groupedBy }: Props) {
  return (
    <div>
      <table className="text-gray-400 dark:text-gray-600 text-sm">
        <tbody>
          <tr className="flex gap-2">
            <td className="text-gray-500 font-bold">{total}</td>
            <td>in</td>
            <td className="text-gray-500 font-bold">{groups}</td>
            <td>{groupedBy === ViewType.Query ? "pages" : "groups"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
