export interface BlutilsResult {
    results: Result[];
    config?: Config;
}

export interface Result {
    runId?: string | null
    query: string
    taxon?: Taxon
}

export interface Taxon {
    reachedRank: string
    maxAllowedRank?: string
    identifier: string
    percIdentity: number
    bitScore: number
    taxonomy: string | null
    mutated: boolean
    singleMatch: boolean
    consensusBeans: ConsensusBean[] | null
}

export interface ConsensusBean {
    rank: string
    identifier: string
    occurrences: number
    taxonomy: string | null
    accessions: string[]
}

export interface Config {
    blutilsVersion: string
    subjectReads: string
    taxon: string
    outFormat: string
    maxTargetSeqs: number
    percIdentity: number
    queryCov: number
    strand: string
    eValue: number
    wordSize: number
}
