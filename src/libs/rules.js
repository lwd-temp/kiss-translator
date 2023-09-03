import { matchValue, type, isMatch } from "./utils";
import {
  GLOBAL_KEY,
  REMAIN_KEY,
  OPT_TRANS_ALL,
  OPT_STYLE_ALL,
  OPT_LANGS_FROM,
  OPT_LANGS_TO,
  GLOBLA_RULE,
  DEFAULT_SUBRULES_LIST,
  DEFAULT_OW_RULE,
} from "../config";
import { loadOrFetchSubRules } from "./subRules";

/**
 * 根据href匹配规则
 * @param {*} rules
 * @param {string} href
 * @returns
 */
export const matchRule = async (
  rules,
  href,
  {
    injectRules = true,
    subrulesList = DEFAULT_SUBRULES_LIST,
    owSubrule = DEFAULT_OW_RULE,
  }
) => {
  rules = [...rules];
  if (injectRules) {
    try {
      const selectedSub = subrulesList.find((item) => item.selected);
      if (selectedSub?.url) {
        const mixRule = {};
        Object.entries(owSubrule)
          .filter(([key, val]) => {
            if (
              owSubrule.textStyle === REMAIN_KEY &&
              (key === "bgColor" || key === "textDiyStyle")
            ) {
              return false;
            }
            return val !== REMAIN_KEY;
          })
          .forEach(([key, val]) => {
            mixRule[key] = val;
          });

        const subRules = (await loadOrFetchSubRules(selectedSub.url)).map(
          (item) => ({ ...item, ...mixRule })
        );
        rules.splice(-1, 0, ...subRules);
      }
    } catch (err) {
      console.log("[load injectRules]", err);
    }
  }

  const rule = rules.find((r) =>
    r.pattern.split(",").some((p) => isMatch(href, p.trim()))
  );

  const globalRule =
    rules.find((r) =>
      r.pattern.split(",").some((p) => p.trim() === GLOBAL_KEY)
    ) || GLOBLA_RULE;

  if (!rule) {
    return globalRule;
  }

  rule.selector =
    rule?.selector?.trim() ||
    globalRule?.selector?.trim() ||
    GLOBLA_RULE.selector;

  rule.bgColor = rule?.bgColor?.trim() || globalRule?.bgColor?.trim();
  rule.textDiyStyle =
    rule?.textDiyStyle?.trim() || globalRule?.textDiyStyle?.trim();

  ["translator", "fromLang", "toLang", "textStyle", "transOpen"].forEach(
    (key) => {
      if (rule[key] === GLOBAL_KEY) {
        rule[key] = globalRule[key];
      }
    }
  );

  return rule;
};

/**
 * 检查过滤rules
 * @param {*} rules
 * @returns
 */
export const checkRules = (rules) => {
  if (type(rules) === "string") {
    rules = JSON.parse(rules);
  }
  if (type(rules) !== "array") {
    throw new Error("data error");
  }

  const fromLangs = OPT_LANGS_FROM.map((item) => item[0]);
  const toLangs = OPT_LANGS_TO.map((item) => item[0]);
  const patternSet = new Set();
  rules = rules
    .filter((rule) => type(rule) === "object")
    .filter(({ pattern }) => {
      if (type(pattern) !== "string" || patternSet.has(pattern.trim())) {
        return false;
      }
      patternSet.add(pattern.trim());
      return true;
    })
    .map(
      ({
        pattern,
        selector,
        translator,
        fromLang,
        toLang,
        textStyle,
        transOpen,
        bgColor,
        textDiyStyle,
      }) => ({
        pattern: pattern.trim(),
        selector: type(selector) === "string" ? selector : "",
        bgColor: type(bgColor) === "string" ? bgColor : "",
        textDiyStyle: type(textDiyStyle) === "string" ? textDiyStyle : "",
        translator: matchValue([GLOBAL_KEY, ...OPT_TRANS_ALL], translator),
        fromLang: matchValue([GLOBAL_KEY, ...fromLangs], fromLang),
        toLang: matchValue([GLOBAL_KEY, ...toLangs], toLang),
        textStyle: matchValue([GLOBAL_KEY, ...OPT_STYLE_ALL], textStyle),
        transOpen: matchValue([GLOBAL_KEY, "true", "false"], transOpen),
      })
    );

  return rules;
};