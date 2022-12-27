const darkGray: { [key: string]: string } = {
  'a': '<:a_darkgray:929417504512684033>',
  'b': '<:b_darkgray:929417514855833630>',
  'c': '<:c_darkgray:929417523244445757>',
  'd': '<:d_darkgray:929417533528866846>',
  'e': '<:e_darkgray:929417545839149095>',
  'f': '<:f_darkgray:929417559445499964>',
  'g': '<:g_darkgray:929417568962379805>',
  'h': '<:h_darkgray:929417577837502514>',
  'i': '<:i_darkgray:929417587270508546>',
  'j': '<:j_darkgray:929417597424898118>',
  'k': '<:k_darkgray:929417605276635156>',
  'l': '<:l_darkgray:929417613602332683>',
  'm': '<:m_darkgray:929417625073774652>',
  'n': '<:n_darkgray:929417636230610985>',
  'o': '<:o_darkgray:929417645390979083>',
  'p': '<:p_darkgray:929417655419535380>',
  'q': '<:q_darkgray:929417666643513364>',
  'r': '<:r_darkgray:929417680207904818>',
  's': '<:s_darkgray:929417692014862366>',
  't': '<:t_darkgray:929417702286700574>',
  'u': '<:u_darkgray:929417718199906354>',
  'v': '<:v_darkgray:929417729528725564>',
  'w': '<:w_darkgray:929417738965893161>',
  'x': '<:x_darkgray:929417750990946354>',
  'y': '<:y_darkgray:929417760897900564>',
  'z': '<:z_darkgray:929417772474171483>',
};

const gray: { [key: string]: string } = {
  'a': '<:a_gray:929174420315058249>',
  'b': '<:b_gray:929174466968318022>',
  'c': '<:c_gray:929174474698407936>',
  'd': '<:d_gray:929174483087028314>',
  'e': '<:e_gray:929174491500798002>',
  'f': '<:f_gray:929174500346585140>',
  'g': '<:g_gray:929174510232559626>',
  'h': '<:h_gray:929174518918946868>',
  'i': '<:i_gray:929174528364511302>',
  'j': '<:j_gray:929174536337887263>',
  'k': '<:k_gray:929174545707978772>',
  'l': '<:l_gray:929174556235685908>',
  'm': '<:m_gray:929174565656072272>',
  'n': '<:n_gray:929174575487533106>',
  'o': '<:o_gray:929174588317909053>',
  'p': '<:p_gray:929174600099708949>',
  'q': '<:q_gray:929174632546852924>',
  'r': '<:r_gray:929174644009877574>',
  's': '<:s_gray:929174657138061312>',
  't': '<:t_gray:929174668571721808>',
  'u': '<:u_gray:929174679606951986>',
  'v': '<:v_gray:929174693167124492>',
  'w': '<:w_gray:929174705133469756>',
  'x': '<:x_gray:929174718546837504>',
  'y': '<:y_gray:929174729703702528>',
  'z': '<:z_gray:929174741590347787>',
};

export default {
  darkGray,
  gray,

  countLettersInPuzzle: (puzzle: string, letter: string): number => puzzle.match(new RegExp(letter, 'g'))?.length ?? 0,
  letterIsVowel: (letter: string): boolean => 'aeiou'.includes(letter),
  letterIsConsonant: (letter: string): boolean => 'bcdfghjklmnpqrstvwxyz'.includes(letter),
  isAnyLetter: (letter: string): boolean => 'abcdefghijklmnopqrstuvwxyz'.includes(letter),

  wordWrap: (sentence: string): string[] => {
    // Initialize variables to store the current line and the remaining text
    let line = '';
    let remaining = sentence;

    // Create an array to store the lines
    let lines: string[] = [];

    // see if we can easily split the sentence in half
    for (let idx = Math.floor(sentence.length * 0.3); idx <= Math.ceil(sentence.length * 0.7); idx++) {
      if (sentence[idx] != ' ') continue;

      const split = [sentence.substring(0, idx), sentence.substring(idx + 1)];
      if (split.some(line => line.length > 14)) continue;
      lines = split;
      remaining = '';
    }

    // Loop until there is no more text to process
    while (remaining.length > 0) {
      // Find the next word in the remaining text
      let dashIndex = remaining.indexOf('-') == -1 ? remaining.length : remaining.indexOf('-') + 1;
      let spaceIndex = remaining.indexOf(' ') == -1 ? remaining.length : remaining.indexOf(' ');

      let nextChunkIndex = Math.min(dashIndex, spaceIndex);

      // Otherwise, the next word is everything up to the next space
      let nextWord = remaining.substring(0, nextChunkIndex);
      remaining = remaining.substring(nextChunkIndex);

      // Check if adding the next word to the current line would exceed the maximum length
      const maxLength = lines.length == 0 || lines.length == 3 ? 12 : 14;
      if (line.length + nextWord.length <= maxLength) {
        // Otherwise, add the next word to the current line with a space
        line += nextWord;
      } else {
        // If it would exceed the maximum length, add the current line to the lines array and reset the current line
        lines.push(line.trimEnd());
        line = nextWord;
      }

      if (line.length < maxLength && remaining[0] == ' ') {
        line += ' ';
        remaining = remaining.substring(1);
      } else if (line.length == maxLength && remaining[0] == ' ') {
        lines.push(line.trimEnd());
        remaining = remaining.substring(1);
        line = '';
      }

      // some dumb ol heuristic to try and even up 3 line puzzles a bit
      if (remaining.length / line.length <= 2) { // don't let the second to last line be really short
        if (lines.length == 1 && remaining.length <= 14) { // don't let the second or third line overflow
          lines.push(line.trimEnd());
          line = remaining;
          remaining = '';
        }
      }
    }

    // Add the final line to the lines array
    if (line.length) lines.push(line);

    // add padding lines so its always 4 rows
    if (lines.length == 1) {
      lines.unshift('');
      lines.push('', '');
    } else if (lines.length == 2) {
      lines.unshift('');
      lines.push('');
    } else if (lines.length == 3) {
      lines.push('');
    }

    // Return the array of lines
    return lines;
  },

  getEmojiBoard(puzzle: string, guessedLetters?: string[]): string {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    let board: string[] = [];

    const lines = this.wordWrap(puzzle);

    const minPadding = Math.min(...lines.map((line, i) => Math.ceil((14 - line.length) / 2)))
    const isCenterAligned = minPadding == 0 || lines.every(line => line.length % 2 == 0);

    lines.forEach((line, i, lines) => {
      let boardLine = '';
      const lineLength = i == 0 || i == 3 ? 12 : 14;
      let halfPad = (lineLength - line.length) / 2;

      if (lineLength == 12) boardLine += '⬛️';

      const left = minPadding - (lineLength == 12 ? 1 : 0);
      const leftActual = (isCenterAligned ? Math.floor(halfPad) : left);
      if (leftActual < 0) {
        console.log(':(');
      }
      boardLine += '🟩'.repeat(leftActual);

      // dumb hack to detect discord and use discord emojis
      if (process.env.DISCORD_TOKEN) {
        for (let letter of line) {
          if (letter == ' ') boardLine += '🟩';
          else if (letters.includes(letter) == false) boardLine += '`' + letter + ' `'; // - & ? ' . ! :
          else if (!guessedLetters || guessedLetters.includes(letter)) boardLine += gray[letter];
          else boardLine += '⬜';
        }
      } else {
        const fullwidth = 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ';    
        for (let letter of line) {
          if (letter == ' ') boardLine += '🟩';
          else if (letters.includes(letter) == false) boardLine += letter; // - & ? ' . ! :
          else if (!guessedLetters || guessedLetters.includes(letter)) boardLine += fullwidth[letters.indexOf(letter)];
          else boardLine += '⬜';
        }
      }

      const right = lineLength - (left + line.length);
      const rightActual = isCenterAligned ? Math.ceil(halfPad) : right;
      if (rightActual < 0) {
        console.log(':(');
      }
      boardLine += '🟩'.repeat(rightActual);

      if (lineLength == 12) boardLine += '⬛️';

      board.push(boardLine);
    });

    return board.join('\n');
  }
}