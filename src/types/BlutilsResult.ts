export interface BlutilsResult {
    results: Result[];
    config?: Config;
}

export interface Result {
    query: string
    taxon?: Taxon
}

export interface Taxon {
    reachedRank: string
    maxAllowedRank?: string
    identifier: string
    percIdentity: number
    bitScore: number
    taxonomy: string
    mutated: boolean
    singleMatch: boolean
    consensusBeans: ConsensusBean[]
}

export interface ConsensusBean {
    rank: string
    identifier: string
    occurrences: number
    taxonomy: string
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
