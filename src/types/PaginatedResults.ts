import { Result } from "./BlutilsResult";
import { ViewType } from "./ViewType";

export interface GroupedResults {
    name: string;
    rank: string;
    taxonomy: string;
    groupedBy: ViewType;
    chunk: Result[];
}
