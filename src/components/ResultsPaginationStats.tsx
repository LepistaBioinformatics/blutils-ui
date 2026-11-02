import { ViewType } from "@/types/ViewType";

interface Props {
  total: number;
  /** Records left after filtering; when below `total`, reads "<shown> of <total>". */
  shown?: number;
  groups: number;
  groupedBy: ViewType;
}

export function ResultsPaginationStats({ total, shown, groups, groupedBy }: Props) {
  const filtered = shown !== undefined && shown !== total;

  return (
    <div>
      <table className="text-gray-400 dark:text-gray-600 text-sm">
        <tbody>
          <tr className="flex gap-2">
            {filtered && (
              <>
                <td className="text-gray-600 dark:text-gray-400 font-bold">{shown}</td>
                <td>of</td>
              </>
            )}
            <td className="text-gray-600 dark:text-gray-400 font-bold">{total}</td>
            {groupedBy === ViewType.Table ? (
              <td>records</td>
            ) : (
              <>
                <td>in</td>
                <td className="text-gray-600 dark:text-gray-400 font-bold">{groups}</td>
                <td>groups</td>
              </>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
