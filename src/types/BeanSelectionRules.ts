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

    export type RuleKind = "unanimous" | "majority" | "ambiguous" | "unresolved";

    export const RULE_KINDS: RuleKind[] = ["unanimous", "majority", "ambiguous", "unresolved"];

    export const RULE_INFO: Record<RuleKind, { label: string; summary: string; explanation: string }> = {
        unanimous: {
            label: "Unanimous",
            summary: "Only one consensus bean",
            explanation:
                "Every reference hit that reached the consensus agrees on a single taxon, so that taxon is proposed directly.",
        },
        majority: {
            label: "Majority",
            summary: "Twice the occurrences of the second most frequent taxon",
            explanation:
                "Several taxa compete. The most frequent one is proposed because it has at least twice the occurrences of the runner-up.",
        },
        ambiguous: {
            label: "Ambiguous",
            summary: "No taxon reaches twice the occurrences of the runner-up",
            explanation:
                "Several taxa compete and none has at least twice the occurrences of the runner-up, so no more specific taxon is proposed than the consensus one.",
        },
        unresolved: {
            label: "Unresolved",
            summary: "No consensus beans",
            explanation:
                "The record has no consensus beans (no significant match, or the engine reported none), so no taxon can be proposed from them.",
        },
    };

    /**
     * The rule as a word. Rule 0 is split: `ambiguous` when beans exist but
     * none wins, `unresolved` when there are no beans at all.
     */
    export function getRuleKind(consensusBeans: ConsensusBean[] | null | undefined): RuleKind {
        const { rule } = getMostProbableTaxon(consensusBeans);
        if (rule === Rules.ABSOLUTE_BEAN) return "unanimous";
        if (rule === Rules.TWICE_OF_SECOND_BEAN) return "majority";
        return consensusBeans && consensusBeans.length > 0 ? "ambiguous" : "unresolved";
    }

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
    export function getMostProbableTaxon(consensusBeans: ConsensusBean[] | null | undefined): ConsensusWithRule {
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
            const orderedConsensusBeans = [...consensusBeans].sort(
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
