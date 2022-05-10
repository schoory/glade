
export const replaceWithComponent = (line, separators, callback) => {

  if (!line) return ['']
  
  const allSeparators = separators.reduce((previous, item) => {
    if (item instanceof RegExp) {
      const matchedStrings = line.match(item);
      if (matchedStrings && matchedStrings.length > 0) {
        previous.push(...matchedStrings);
      }
    }
    else {
      previous.push(item);
    }
    return previous;
  }, []);

  if (allSeparators.length === 0) return [line];

  const output = [line];

  const findAndReplace = (output, itemIndex) => {
    const result = [];
    output.forEach((item) => {
      const nearestSeparator = allSeparators.reduce((previous, separator) => {
        if (separator) {
          const separatorIndex = item.indexOf(separator);
          if (previous.index === -1 && separatorIndex !== -1) {
              return { index: separatorIndex, separator: separator };
          }
          if (separatorIndex < previous.index && previous.index !== -1 && separatorIndex !== -1) {
              return { index: separatorIndex, separator: separator };
          }
        }
        return previous;
      }, { index: -1, separator: '' });
      if (nearestSeparator.index !== -1) {
        const start = item.substring(0, nearestSeparator.index);
        const end = item.substring(nearestSeparator.index + nearestSeparator.separator.length);
        result.push(start, callback(nearestSeparator.separator, itemIndex), ...findAndReplace([end], itemIndex + 1));
      } else {
        result.push(item)
      }
    });
    return result;
  };
  return findAndReplace(output, 0);
};