import { createDiagnosticHandler, createParser, SyntaxKind, ParserSink } from "../src/parser";
import { compile, CalcValue, CalcObj, CalcFun } from "../src/compiler";
import * as assert from "assert";
import "mocha";

const astSink: ParserSink<object> = {
    lit(value: number | string | boolean, start: number, end: number) {
        return { start, end, value };
    },
    ident(id: string, start: number, end: number) {
        return { start, end, id };
    },
    field(label: string, start: number, end: number) {
        return { start, end, label };
    },
    paren(expr: object, start: number, end: number) {
        return { start, end, expr };
    },
    app(head: object, args: object[], start: number, end: number) {
        return { start, end, head, args }
    },
    dot(left: object, right: object, start: number, end: number) {
        return { start, end, left, right }
    },
    binOp(op: SyntaxKind, left: object, right: object, start: number, end: number) {
        return { start, end, op, left, right }
    },
    unaryOp(op: SyntaxKind, expr: object, start: number, end: number) {
        return { start, end, op, expr }
    },
    missing(pos: number) {
        return { pos }
    }
};

export const astParse = createParser(astSink, createDiagnosticHandler());

const sum: CalcFun = <O>(_trace: any, _host: O, args: any[]) => args.reduce((prev, now) => prev + now, 0);
const prod: CalcFun = <O>(_trace: any, _host: O, args: any[]) => args.reduce((prev, now) => prev * now, 1);

const testContext: CalcObj<undefined> = {
    request: (_origin: undefined, property: string) => {
        switch (property) {
            case "Foo": return 3;
            case "Bar": return 5;
            case "Baz": return { kind: "Pending" };
            case "Qux": return { kind: "Pending" };
            case "Sum": return sum;
            case "Product": return prod;
            default: return 0;
        }
    }
}

describe("nano", () => {
    function parseTest(expression: string, expected: object, errorCount: number) {
        it(`Parse: ${expression}`, () => {
            const [errors, ast] = astParse(expression);
            assert.deepEqual(ast, expected);
            assert.strictEqual(errors.length, errorCount);
        });
    }

    function evalTest(expression: string, expected: CalcValue<any>) {
        it(`Eval: ${expression}`, () => {
            const f = compile(expression);
            assert.notEqual(f, undefined);
            const [pending, actual] = f!(undefined, testContext);
            assert.deepEqual(pending, []);
            assert.strictEqual(actual, expected);
        });
    }

    const parseCases = [
        {
            expression: "FOO(A.    , , ###)",
            expected: {
                "start": 0,
                "end": 18,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "start": 4,
                        "end": 6,
                        "left": {
                            "start": 4,
                            "end": 5,
                            "id": "A"
                        },
                        "right": {
                            "pos": 6
                        }
                    },
                    {
                        "pos": 11
                    },
                    {
                        "pos": 13
                    }
                ]
            },
            errorCount: 3
        },
        {
            expression: "FOO( +  , BAR(,  ##3,   A.    , , ###)",
            expected: {
                "start": 0,
                "end": 38,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "start": 4,
                        "end": 6,
                        "op": 9,
                        "expr": {
                            "pos": 6
                        }
                    },
                    {
                        "start": 9,
                        "end": 38,
                        "head": {
                            "start": 9,
                            "end": 13,
                            "id": "BAR"
                        },
                        "args": [
                            {
                                "pos": 14
                            },
                            {
                                "start": 19,
                                "end": 20,
                                "value": 3
                            },
                            {
                                "start": 21,
                                "end": 26,
                                "left": {
                                    "start": 21,
                                    "end": 25,
                                    "id": "A"
                                },
                                "right": {
                                    "pos": 26
                                }
                            },
                            {
                                "pos": 31
                            },
                            {
                                "pos": 33
                            }
                        ]
                    }
                ]
            },
            errorCount: 6
        },
        {
            expression: "FOO(#3#)",
            expected: {
                "start": 0,
                "end": 8,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "start": 5,
                        "end": 6,
                        "value": 3
                    }
                ]
            },
            errorCount: 2
        },
        {
            expression: "FOO(    ####, #    )",
            expected: {
                "start": 0,
                "end": 20,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "pos": 4
                    },
                    {
                        "pos": 13
                    }
                ]
            },
            errorCount: 5
        },
        {
            expression: "FOO(#3)",
            expected: {
                "start": 0,
                "end": 7,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "start": 5,
                        "end": 6,
                        "value": 3
                    }
                ]
            },
            errorCount: 1
        },
        {
            expression: "FOO(3#3)",
            expected: {
                "start": 0,
                "end": 8,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "start": 4,
                        "end": 5,
                        "value": 3
                    },
                    {
                        "start": 6,
                        "end": 7,
                        "value": 3
                    }
                ]
            },
            errorCount: 2
        },
        {
            expression: "FOO(  ,  ,     ,)",
            expected: {
                "start": 0,
                "end": 17,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "pos": 4
                    },
                    {
                        "pos": 7
                    },
                    {
                        "pos": 10
                    },
                    {
                        "pos": 16
                    }
                ]
            },
            errorCount: 0
        },
        {
            expression: "FOO(#  ,  # , ##  3  ##, # ##     ",
            expected: {
                "start": 0,
                "end": 29,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "pos": 4
                    },
                    {
                        "pos": 8
                    },
                    {
                        "start": 16,
                        "end": 19,
                        "value": 3
                    },
                    {
                        "pos": 24
                    }
                ]
            },
            errorCount: 10
        },
        {
            expression: "(3433.454+(33.34)",
            expected: {
                "start": 0,
                "end": 17,
                "expr": {
                    "start": 1,
                    "end": 17,
                    "op": 9,
                    "left": {
                        "start": 1,
                        "end": 9,
                        "value": 3433.454
                    },
                    "right": {
                        "start": 10,
                        "end": 17,
                        "expr": {
                            "start": 11,
                            "end": 16,
                            "value": 33.34
                        }
                    }
                }
            },
            errorCount: 1
        },
        {
            expression: "A.B..C..D + 3 *",
            expected: {
                "start": 0,
                "end": 15,
                "op": 9,
                "left": {
                    "start": 0,
                    "end": 9,
                    "left": {
                        "start": 0,
                        "end": 7,
                        "left": {
                            "start": 0,
                            "end": 6,
                            "left": {
                                "start": 0,
                                "end": 4,
                                "left": {
                                    "start": 0,
                                    "end": 3,
                                    "left": {
                                        "start": 0,
                                        "end": 1,
                                        "id": "A"
                                    },
                                    "right": {
                                        "start": 2,
                                        "end": 3,
                                        "label": "B"
                                    }
                                },
                                "right": {
                                    "pos": 4
                                }
                            },
                            "right": {
                                "start": 5,
                                "end": 6,
                                "label": "C"
                            }
                        },
                        "right": {
                            "pos": 7
                        }
                    },
                    "right": {
                        "start": 8,
                        "end": 9,
                        "label": "D"
                    }
                },
                "right": {
                    "start": 11,
                    "end": 15,
                    "op": 7,
                    "left": {
                        "start": 11,
                        "end": 13,
                        "value": 3
                    },
                    "right": {
                        "pos": 15
                    }
                }
            },
            errorCount: 0
        },
        {
            expression: "Math(33).max(33) + 41(34)",
            expected: {
                "start": 0,
                "end": 25,
                "op": 9,
                "left": {
                    "start": 0,
                    "end": 16,
                    "head": {
                        "start": 0,
                        "end": 12,
                        "left": {
                            "start": 0,
                            "end": 8,
                            "head": {
                                "start": 0,
                                "end": 4,
                                "id": "Math"
                            },
                            "args": [
                                {
                                    "start": 5,
                                    "end": 7,
                                    "value": 33
                                }
                            ]
                        },
                        "right": {
                            "start": 9,
                            "end": 12,
                            "label": "max"
                        }
                    },
                    "args": [
                        {
                            "start": 13,
                            "end": 15,
                            "value": 33
                        }
                    ]
                },
                "right": {
                    "start": 18,
                    "end": 25,
                    "head": {
                        "start": 18,
                        "end": 21,
                        "value": 41
                    },
                    "args": [
                        {
                            "start": 22,
                            "end": 24,
                            "value": 34
                        }
                    ]
                }
            },
            errorCount: 0
        },
        {
            expression: "Foo.Bar. + A.B..C. -",
            expected: {
                "start": 0,
                "end": 20,
                "op": 10,
                "left": {
                    "start": 0,
                    "end": 18,
                    "op": 9,
                    "left": {
                        "start": 0,
                        "end": 8,
                        "left": {
                            "start": 0,
                            "end": 7,
                            "left": {
                                "start": 0,
                                "end": 3,
                                "id": "Foo"
                            },
                            "right": {
                                "start": 4,
                                "end": 7,
                                "label": "Bar"
                            }
                        },
                        "right": {
                            "pos": 8
                        }
                    },
                    "right": {
                        "start": 10,
                        "end": 18,
                        "left": {
                            "start": 10,
                            "end": 17,
                            "left": {
                                "start": 10,
                                "end": 15,
                                "left": {
                                    "start": 10,
                                    "end": 14,
                                    "left": {
                                        "start": 10,
                                        "end": 12,
                                        "id": "A"
                                    },
                                    "right": {
                                        "start": 13,
                                        "end": 14,
                                        "label": "B"
                                    }
                                },
                                "right": {
                                    "pos": 15
                                }
                            },
                            "right": {
                                "start": 16,
                                "end": 17,
                                "label": "C"
                            }
                        },
                        "right": {
                            "pos": 18
                        }
                    }
                },
                "right": {
                    "pos": 20
                }
            },
            errorCount: 0
        },
        {
            expression: "10 + 42.Foobar + 3",
            expected: {
                "start": 0,
                "end": 8,
                "op": 9,
                "left": {
                    "start": 0,
                    "end": 2,
                    "value": 10
                },
                "right": {
                    "start": 4,
                    "end": 8,
                    "value": 42
                }
            },
            errorCount: 1
        },
        {
            expression: "Function(10, 42.Foobar, 5)",
            expected: {
                "start": 0,
                "end": 26,
                "head": {
                    "start": 0,
                    "end": 8,
                    "id": "Function"
                },
                "args": [
                    {
                        "start": 9,
                        "end": 11,
                        "value": 10
                    },
                    {
                        "start": 12,
                        "end": 16,
                        "value": 42
                    },
                    {
                        "start": 16,
                        "end": 22,
                        "id": "Foobar"
                    },
                    {
                        "start": 23,
                        "end": 25,
                        "value": 5
                    }
                ]
            },
            errorCount: 1
        },
        {
            expression: "----4",
            expected: {
                "start": 0,
                "end": 5,
                "op": 10,
                "expr": {
                    "start": 1,
                    "end": 5,
                    "op": 10,
                    "expr": {
                        "start": 2,
                        "end": 5,
                        "op": 10,
                        "expr": {
                            "start": 3,
                            "end": 5,
                            "op": 10,
                            "expr": {
                                "start": 4,
                                "end": 5,
                                "value": 4
                            }
                        }
                    }
                }
            },
            errorCount: 0
        },
        {
            expression: "-4+-4+",
            expected: {
                "start": 0,
                "end": 6,
                "op": 9,
                "left": {
                    "start": 0,
                    "end": 5,
                    "op": 9,
                    "left": {
                        "start": 0,
                        "end": 2,
                        "op": 10,
                        "expr": {
                            "start": 1,
                            "end": 2,
                            "value": 4
                        }
                    },
                    "right": {
                        "start": 3,
                        "end": 5,
                        "op": 10,
                        "expr": {
                            "start": 4,
                            "end": 5,
                            "value": 4
                        }
                    }
                },
                "right": {
                    "pos": 6
                }
            },
            errorCount: 0
        },
    ]

    const evalCases = [
        { expression: "----4", expected: 4 },
        { expression: "-4+-4", expected: -8 },
        { expression: "-4++-4", expected: -8 },
        { expression: "-4--4", expected: 0 },
        { expression: "Sum(Foo + Bar, Bar * Foo, 3, IF(Foo < 0, 10, 100))", expected: 126 },
        {
            expression: `Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Product(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Product(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Product(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)`, expected: 259
        },
        { expression: "IF(Foo > 2, Foo + Bar, Bar * Foo)", expected: 8 },
        { expression: "1.3333 + 2.2222", expected: 3.5555 },
        { expression: "1 + 2    + 3 + 4 =   10 - 10 + 10", expected: true },
        { expression: "IF(1*2*3*4<>8, 'hello' + 'world', 10 / 2)", expected: "helloworld" },
        { expression: "IF(1*2*3*4<>24, 'hello' + 'world', 10 / 2)", expected: 5 },
        { expression: "IF(1*2*3*4<>24, 'hello' + 'world')", expected: false },
        { expression: "1*2+3*4", expected: 14 },
        { expression: "4*1*2+3*4", expected: 20 },
        { expression: "4*1*(2+3)*4", expected: 80 },
        { expression: "Foo + Bar", expected: 8 },
        { expression: "IF(Foo * Bar > 10000, 'left', 'right')", expected: "right" },
        { expression: "4(3,2).message", expected: "The target of an application must be a calc function." },
        { expression: "(Sum + 3).message", expected: "Operator argument must be a primitive." },
        { expression: "42.", expected: 42 },
        { expression: "42.01", expected: 42.01 }
    ]

    for (const { expression, expected, errorCount } of parseCases) {
        parseTest(expression, expected, errorCount);
    }

    for (const { expression, expected } of evalCases) {
        evalTest(expression, expected);
    }
});
