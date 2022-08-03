function isOk(res) {
    return res !== null;
}
/**
     * Запускает переданную функцию на успешном результате парсера.
     * Возвращает null, если падает переданный парсер.
     * @param p возвращаемый результат функции
     * @param fn функция преобразования результата
     * @return Парсер с преобразованным результатом
 */
function map(p, fn) {
    return ((str) => {
        const result = p(str);
        if (!isOk(result)) {
            return null;
        }
        return [fn(result[0]), result[1]];
    });
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
function and(p1, p2) {
    return ((str) => {
        const res1 = p1(str);
        if (!isOk(res1)) {
            return null;
        }
        const res2 = p2(res1[1]);
        if (!isOk(res2)) {
            return null;
        }
        return [[res1[0], res2[0]], res2[1]];
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
function then(p1, p2) {
    return ((str) => map(and(p1, p2), (([_, b]) => b))(str));
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
function before(p1, p2) {
    return ((str) => map(and(p1, p2), (([a, _]) => a))(str));
}
/**
     * Запускает переданный парсер p1 и, если он падает, запускает парсер p2 на той же строке.
     * @param p2 первый парсер, который запускается на строке
     * @param p2 парсер, который нужно запустить в случае неудачи
     * @return Парсер с результатом первого или второго парсера
     * @see [and]
 */
function or(p1, p2) {
    return ((str) => {
        const res = p1(str);
        if (isOk(res)) {
            return res;
        }
        return p2(str);
    });
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
function many(p) {
    return ((str) => {
        let res = [];
        let rem = str;
        let maybeRes = p(rem);
        while (isOk(maybeRes) && maybeRes[1] !== rem) {
            rem = maybeRes[1];
            res = [...res, maybeRes[0]];
            maybeRes = p(rem);
        }
        return [res, rem];
    });
}
/**
 * Принимает парсер и запускает его на строке до первой неудачи.
 * Возвращает один или более успхов.
 * @param p парсер для запуска на строке
 * @return Парсер со списком распаршенных результатов. Список содержит хотя бы один элемент
 * @see [many]
 */
function some(p) {
    return ((str) => {
        const res = p(str);
        if (!isOk(res)) {
            return null;
        }
        return map(many(p), (lst) => [res[0], ...lst])(res[1]);
    });
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
function charPredicate(fn) {
    return ((str) => {
        if (str.length === 0) {
            return null;
        }
        if (!fn(str[0])) {
            return null;
        }
        return [str[0], str.slice(1)];
    });
}
/**
 * Принимает строку в качестве параметра.
 * Возвращает один или более успхов.
 * @param c строка для запуска на парсере
 * @return Парсер со списком распаршенных результатом и остатком строки.
 * @see [char]
 */
function char(c) {
    if (c.length !== 1) {
        throw new Error();
    }
    return charPredicate(s => s === c);
}
/**  Grammar:
 * Query -> BlockSequence
 * BlockSequence -> Block ('.' Block)*
 * Block -> ALPHA_NUM ('[' blockSequence ']')?
 * ALPHA_NUM -> [a-zA-Z0-9]+
 */
const ALPHA_NUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const alphaNumericChar = charPredicate((s) => ALPHA_NUM.includes(s));
const block = map(some(alphaNumericChar), (s) => s.join("")); // TODO: processing square brackes
const blockSequence = map(and(block, many(then(char('.'), block))), ([b, lst]) => [b, ...lst]);
const query = blockSequence;
var query_r = query("address.city");
var context = {
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
};
function parser1(context, arr) {
    var result = arr.reduce((acc, val) => acc[val], context);
    if (result === undefined) {
        console.log("incorrectly entered query");
    }
    else {
        console.log(result);
    }
    return result;
}
if (query_r !== null) {
    parser1(context, query_r[0]);
}
else {
    console.log("error");
}
