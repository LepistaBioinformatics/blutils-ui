import { ConsensusBean } from "./BlutilsResult";

export namespace BeanSelectionRules {
    enum Rules {
        NO_BEANS = 0,
        ABSOLUTE_BEAN,
        TWICE_OF_SECOND_BEAN,
    }

    type ConsensusWithRule = {
        bean: ConsensusBean | undefined;
        rule: Rules;
    };

    /**
     * Get the description of the rule as a string
     * 
     * @param rule The rule to get the description for
     * @returns The rule description
     */
    export function getRuleDescription(rule: number): string {
        switch (rule) {
            case Rules.NO_BEANS:
                return "No consensus beans";
            case Rules.ABSOLUTE_BEAN:
                return "Only one consensus bean";
            case Rules.TWICE_OF_SECOND_BEAN:
                return "Twice the occurrences of the second most frequent taxon";
            default:
                throw new Error("Invalid rule");
        }
    }

    /**
     * Get the most probable taxon from the consensus beans
     *
     * The most probable taxon is determined as follows:
     *
     * 1. If there is only one consensus bean, return it as the most probable
     *    taxon
     *
     * 2. If there are more than one consensus beans, return the one with the most
     *    occurrences
     *
     * 3. If there are more than one consensus beans, return the one with the most
     *    occurrences, but only if it has at least twice the occurrences of the
     *    second most probable taxon
     *
     * @param consensusBeans
     * @returns The most probable taxon
     */
    export function getMostProbableTaxon(consensusBeans: ConsensusBean[] | undefined): ConsensusWithRule {
        const defaultBean = {
            bean: undefined,
            rule: Rules.NO_BEANS,
        };

        if (!consensusBeans) {
            return defaultBean;
        }

        if (consensusBeans.length === 1) {
            return {
                bean: consensusBeans[0],
                rule: Rules.ABSOLUTE_BEAN,
            };
        }

        if (consensusBeans.length > 1) {
            const orderedConsensusBeans = consensusBeans.sort(
                (a, b) => b.occurrences - a.occurrences
            );

            const first = orderedConsensusBeans[0];
            const second = orderedConsensusBeans[1];

            if (first && second && first.occurrences >= second.occurrences * 2) {
                return {
                    bean: first,
                    rule: Rules.TWICE_OF_SECOND_BEAN,
                };
            }
        }

        return defaultBean;
    }
}
