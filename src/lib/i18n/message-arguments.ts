import {
  TYPE,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";

export const walkMessage = (
  elements: MessageFormatElement[],
  visit: (element: MessageFormatElement) => void,
) => {
  for (const element of elements) {
    visit(element);
    if (element.type === TYPE.plural || element.type === TYPE.select)
      for (const option of Object.values(element.options))
        walkMessage(option.value, visit);
    if (element.type === TYPE.tag) walkMessage(element.children, visit);
  }
};

export const messageArguments = (elements: MessageFormatElement[]) => {
  const names = new Set<string>();
  walkMessage(elements, (element) => {
    if ("value" in element && element.type !== TYPE.literal)
      names.add(element.value);
  });
  return [...names].sort();
};
