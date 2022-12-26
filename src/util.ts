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

  wordWrap: (sentence: string, maxLength: number): string[] => {
    // Initialize variables to store the current line and the remaining text
    let line = "";
    let remaining = sentence;

    // Create an array to store the lines
    let lines = [];

    // Loop until there is no more text to process
    while (remaining.length > 0) {
      // Find the next word in the remaining text
      let spaceIndex = remaining.indexOf(" ");
      let nextWord;
      if (spaceIndex === -1) {
        // If there are no more spaces, the next word is the rest of the text
        nextWord = remaining;
        remaining = "";
      } else {
        // Otherwise, the next word is everything up to the next space
        nextWord = remaining.substring(0, spaceIndex);
        remaining = remaining.substring(spaceIndex + 1);
      }

      // Check if adding the next word to the current line would exceed the maximum length
      if (line.length + nextWord.length + 1 > maxLength) {
        // If it would exceed the maximum length, add the current line to the lines array and reset the current line
        lines.push(line);
        line = nextWord;
      } else {
        // Otherwise, add the next word to the current line with a space
        if (line.length != 0) line += " ";
        line += nextWord;
      }
    }

    // Add the final line to the lines array
    lines.push(line);

    // Return the array of lines
    return lines;
  },

  getEmojiBoard(puzzle: string, guessedLetters?: string[]): string {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const fullwidth = 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ';
    let board = [];

    const lines = this.wordWrap(puzzle, 12);

    if (lines.length < 3) {
      board.push('⬛🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬛');
    }

    // FIXME: left align all lines if can't exactly center?
    // if last halfpad and current halfpad are 1 away, flip floor/ceil?
    for (let line of lines) {
      let boardLine = '';
      const lineLength = board.length == 0 || board.length == 3 ? 12 : 14
      let halfPad = (lineLength - line.length) / 2;

      if (lineLength == 12) boardLine += '⬛';
      boardLine += '🟩'.repeat(Math.floor(halfPad));

      // dumb hack to detect discord and use regional indicators
      if (process.env.DISCORD_TOKEN) {
        for (let letter of line) {
          if (letter == ' ') boardLine += '🟩';
          else if (letters.includes(letter) == false) boardLine += '`' + letter + ' `'; // - & ? ' . ! :
          else if (!guessedLetters || guessedLetters.includes(letter)) boardLine += gray[letter];
          else boardLine += '⬜';
        }
      } else {
        for (let letter of line) {
          if (letter == ' ') boardLine += '🟩';
          else if (letters.includes(letter) == false) boardLine += letter; // - & ? ' . ! :
          else if (!guessedLetters || guessedLetters.includes(letter)) boardLine += fullwidth[letters.indexOf(letter)];
          else boardLine += '⬜';
        }
      }

      boardLine += '🟩'.repeat(Math.ceil(halfPad));
      if (lineLength == 12) boardLine += '⬛';

      board.push(boardLine);
    }

    if (board.length == 2) board.push('🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩');
    if (board.length == 3) board.push('⬛🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬛');

    return board.join('\n');
  }
}