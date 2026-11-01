import { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConsensusBean, Result, Taxon } from "@/types/BlutilsResult";

export { triggerIntersection, MockIntersectionObserver } from "./intersection-observer";

export function renderWithRouter(ui: ReactElement, { route = "/" } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

export function makeBean(overrides: Partial<ConsensusBean> = {}): ConsensusBean {
  return {
    rank: "genus",
    identifier: "bacillus",
    occurrences: 1,
    taxonomy: "d__bacteria;g__bacillus",
    accessions: ["NR000001.1"],
    ...overrides,
  };
}

export function makeTaxon(overrides: Partial<Taxon> = {}): Taxon {
  return {
    reachedRank: "genus",
    maxAllowedRank: undefined,
    identifier: "bacillus",
    percIdentity: 99.356,
    bitScore: 845,
    taxonomy: "d__bacteria;g__bacillus",
    mutated: false,
    singleMatch: false,
    consensusBeans: [makeBean()],
    ...overrides,
  };
}

export function makeResult(overrides: Partial<Result> = {}): Result {
  return { query: "query-1", taxon: makeTaxon(), ...overrides };
}
