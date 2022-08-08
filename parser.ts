type ParserResult<T> = [T, string] | null
type Parser<T> = (str: string) => ParserResult<T>;

function isOk(res: ParserResult<any>): boolean {
    return res !== null
}

/**
     * Запускает переданную функцию на успешном результате парсера.
     * Возвращает null, если падает переданный парсер.
     * @param p возвращаемый результат функции
     * @param fn функция преобразования результата
     * @return Парсер с преобразованным результатом
 */
function map<T, R>(p: Parser<T>, fn: (_: T) => R): Parser<R> {
    return ((str) => {
        const result = p(str);

        if (!isOk(result)) {
            return null;
        }

        return [fn(result![0]), result![1]];
    })
}

/**
     * Запускает на строке сначала переданный парсер p1, а потом p2 на остатке строки.
     * Возвращает null, если падает хотя бы один парсер.
     * Возвращает парсер, содержащий пару из результатов первого и второго парсера и остаток строки.
     * @param p1 тип возвращаемого результата второго парсера
     * @param p2 парсер для запуска на остатке строки
     * @return Парсер, который запустит последовательно два парсера и соберёт результат в пару
     * @see [before]
     * @see [then]
     * @see [or]
 */

function and<A, B>(p1: Parser<A>, p2: Parser<B>): Parser<[A, B]> {
    return ((str) => {
        const res1 = p1(str);

        if (!isOk(res1)) {
            return null;
        }

        const res2 = p2(res1![1])

        if (!isOk(res2)) {
            return null;
        }

        return [[res1![0], res2![0]], res2![1]]
    });
}

/**
     * Запускает на строке сначала переданный парсер p1, а потом p2 на остатке строки.
     * Возвращает null, если падает хотя бы один из парсеров.
     * Отбрасывает результат первого парсера
     * @param p1 
     * @param p2
     * @return Парсер, который запускает на строке последовательно два парсера и вернёт результат второго
     * @see [before]
     * @see [and]
 */

function then<A, B>(p1: Parser<A>, p2: Parser<B>): Parser<B> {
    return ((str) => map(and(p1, p2), (([_, b]) => b))(str))
}

/**
     * Запускает на строке сначала переданный парсер p1, а потом p2 на остатке строки.
     * Возвращает failure, если упадёт хотя бы один парсер.
     * Отбрасывает результат второго парсера.
     * @param p1
     * @param p2 
     * @return Парсер, который запустит последовательно два парсера и вернёт результат первого
     * @see [then]
     * @see [and]
*/
function before<A, B>(p1: Parser<A>, p2: Parser<B>): Parser<A> {
    return ((str) => map(and(p1, p2), (([a, _]) => a))(str))
}

/**
     * Запускает переданный парсер p1 и, если он падает, запускает парсер p2 на той же строке.
     * @param p2 первый парсер, который запускается на строке
     * @param p2 парсер, который нужно запустить в случае неудачи
     * @return Парсер с результатом первого или второго парсера
     * @see [and]
 */
function or<A>(p1: Parser<A>, p2: Parser<A>): Parser<A> {
    return ((str) => {
        const res = p1(str)

        if (isOk(res)) {
            return res
        }

        return p2(str);
    })
}

/**
 * Принимает парсер и парсит им строку до первой неудачи.
 * Возвращает нуль или более успехов.
 * ВАЖНО: итерация парсинга считается успешной, если
 * остаток "после" не равен остатку "до" по оператору !==
 * @param p парсер для запуска на строке
 * @return Парсер со списком распаршенных результатов. Список может быть пустым,
 * поэтому результирующий парсер всегда успешен
 * @see [some]
 */
function many<T>(p: Parser<T>): Parser<T[]> {
    return ((str) => {
        let res = [] as T[]
        let rem = str
        let maybeRes = p(rem)

        while (isOk(maybeRes) && maybeRes![1] !== rem) {
            rem = maybeRes![1]
            res = [...res, maybeRes![0]]
            maybeRes = p(rem)
        }
        return [res, rem]
    })
}

/**
 * Принимает парсер и запускает его на строке до первой неудачи.
 * Возвращает один или более успхов.
 * @param p парсер для запуска на строке
 * @return Парсер со списком распаршенных результатов. Список содержит хотя бы один элемент
 * @see [many]
 */
function some<T>(p: Parser<T>): Parser<T[]> {
    return ((str) => {
        const res = p(str);
        if (!isOk(res)) {
            return null;
        }
        return map(many(p), (lst) => [res![0], ...lst])(res![1])
    })
}

function maybe<T>(p: Parser<T>): Parser<T[]> {
    return ((str) => {
        console.log("MAYBE", str)
        const res = p(str);
        
        if (!isOk(res)) {
            return [[], str];
        }
        return [[res[0]], res[1]];
    })
}

/**
 * Принимает функцию о строкой в качестве параметра.
 * Возвращает один или более успхов.
 * Возвращает null если строка пустая 
 * Возвращает null если результат функции проверки символа строки false
 * @param fn функция для запуска на строке
 * @return Парсер со списком распаршенных результатом и концом строки.
 * @see [char]
 */
function charPredicate(fn: (c: string) => boolean): Parser<string> {
    return ((str) => {
        if (str.length === 0) {
            return null;
        }

        if (!fn(str[0])) {
            return null;
        }
        return [str[0], str.slice(1)]
    })
}

/**
 * Принимает строку в качестве параметра.
 * Возвращает один или более успхов.
 * @param c строка для запуска на парсере
 * @return Парсер со списком распаршенных результатом и остатком строки.
 * @see [char]
 */
function char(c: string): Parser<string> {
    if (c.length !== 1) {
        throw new Error()
    }
    return charPredicate(s => s === c)
}

/**  Grammar:
 * Query -> BlockSequence
 * BlockSequence -> Block ('.' Block)*
 * Block -> ALPHA_NUM ('[' blockSequence ']')?
 * ALPHA_NUM -> [a-zA-Z0-9]+
 */
const ALPHA_NUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**  Grammar:
 * Query -> BlockSequence
 * BlockSequence -> Block ('.' Block)*
 * Block -> Word ('[' blockSequence ']')?
 * Word -> [a-zA-Z0-9]+
 */

 interface Block {
    word: string, // Word in block
    index: Block[], // Blocks in brackets. Empty if no brackets present
}

const alphaNumericChar = charPredicate((s) => ALPHA_NUM.includes(s))
const word = map(some(alphaNumericChar), s => s.join(""))

// Mutual recursive parsers defined as factory functions
function blockFactory(): Parser<Block> {
    return map(
        and(word, maybe(then(char('['), before(blockSequenceFactory(), char(']'))))),
        ([word, maybeWords]) => {
            console.log("BF", maybeWords)
            if (maybeWords.length === 0) {
                return {
                    word,
                    index: []
                }
            }

            return {
                word,
                index: maybeWords[1]
            }
        }
)}

function blockSequenceFactory(): Parser<Block[]> {
    return map(
        and(blockFactory(), many(then(char('.'), blockFactory()))),
        ([b, lst]) => [b, ...lst]
    )
}


// Actual parsers
const block = blockFactory()
const blockSequence = blockSequenceFactory()

const query = blockSequence;
// books[currentBook].page
const query_r = query("books[currentBook].page");
console.log(query_r);

const context = {
    name: "Donald",
    age: 18,
    address: {
        city: "New York"
    },
    books: [
        {
            title: "Treasure Island",
            pages: 312
        },
        {
            title: "Oliver Twist",
            pages: 299
        }
    ],
    currentBook: 1,
}

function parser1(context, arr) {
    var result = arr.reduce((acc, val) => acc[val], context)
    console.log(result)
    return result;
}
