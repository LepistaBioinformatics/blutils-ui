import { Result } from "./BlutilsResult";
import { ViewType } from "./ViewType";

export interface ResultsGroupedByQuery {
    /**
     * Name must be the same as the query or the taxonomy
     */
    name: string;
    rank: string;
    groupedBy: ViewType;
    chunk: Result[];
}


export interface ResultsGroupedByTaxonomy extends ResultsGroupedByQuery {
    taxonomy: string;
}
