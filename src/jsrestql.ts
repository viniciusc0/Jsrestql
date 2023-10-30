import config from "../jsrestql.json";
import { ApiService } from "./api.service";

export default class Jsrestql {
  private queryCommand: string;
  private readonly environments: { [key: string]: any };
  private readonly apis: { [key: string]: any };
  private response: { [key: string]: any };

  constructor(_query: string, _environments: { [key: string]: any }) {
    this.queryCommand = _query;
    this.environments = _environments;
    this.apis = config.apis;
    this.response = {};
  }

  private getQueries(): string[] {
    let querys: any = [];
    const queryText = this.queryCommand
      .replace(/\n/g, "")
      .split(" ")
      .filter((item) => item)
      .map((item) => item.toLowerCase())
      .join(" ");

    if (!queryText.includes("then")) {
      querys = queryText.split(";").filter((item) => item);
    } else {
      const partialQuery = queryText.split(";").filter((item) => item);
      let indexThen = -1;
      let indexEnd = -1;
      let str = "";

      partialQuery.forEach((queryItem, index) => {
        if (
          !queryItem.includes("then") &&
          (queryItem.includes("from") || queryItem.includes("to")) &&
          indexThen == -1 &&
          indexEnd == -1
        ) {
          querys.push(queryItem);
        }

        if (queryItem.includes("then")) {
          indexThen = index;
        }
        if (queryItem.includes("end")) {
          indexEnd = index;
        }

        if (indexThen > -1 && indexEnd > -1) {
          for (let index = indexThen; index <= indexEnd; index++) {
            str += ` ${partialQuery[index]};`;
          }
          indexThen = -1;
          indexEnd = -1;

          querys.push(str);
          str = "";
        }
      });
    }

    if (!querys || !querys.length) {
      throw new Error("Query não identificada");
    }

    return querys;
  }

  private getFilters(query: string): {
    inFilters: { [key: string]: any };
    isJoin: boolean;
    searchParams: string;
  } {
    const searchParams = new URLSearchParams();
    let filters: { [key: string]: any } = {};
    let isJoin: boolean = false;
    const whereParams = query
      .substring(
        query.indexOf("where"),
        query.indexOf("having") > -1 ? query.indexOf("having") : query.length
      )
      .replace(/where/g, "")
      .replace(/ /g, "")
      .replace(/;/g, "")
      .trim()
      .split(",");

    if (whereParams && whereParams.length) {
      whereParams.forEach((param) => {
        const filter = param.split("=");
        isJoin = filter[1].includes(".");
        if (this.response && filter[1].includes(".")) {
          const filterAlias = filter[1].split(".");
          const keyResponse = filterAlias[0];
          const propsInKeyResponse = filterAlias[1];
          if (Object.keys(this.response)?.includes(keyResponse)) {
            const obj = this.response[keyResponse][0];
            const key = Object.keys(obj).find(
              (item) => item.toLowerCase() == propsInKeyResponse
            );
            if (
              Array(this.response[keyResponse]) &&
              this.response[keyResponse].length
            ) {
              if (key) {
                filter[1] = this.response[keyResponse][0][key];
              }
            } else {
              if (key) {
                filter[1] = this.response[keyResponse][key];
              }
            }
          }
        }

        searchParams.append(`${filter[0]}`, `${filter[1]}`);
        filters[filter[0]] = filter[1];
      });
    }

    return {
      inFilters: filters,
      isJoin,
      searchParams: searchParams.toString(),
    };
  }

  private getBody(query: string): { [key: string]: any } {
    const body: { [key: string]: any } = {};
    const bodyParams = query
      .substring(query.indexOf("body"), query.length)
      .replace(/body/g, "")
      .replace(/;/g, "")
      .trim()
      .split(",");
    if (bodyParams && bodyParams.length) {
      bodyParams.forEach((param: any) => {
        const bodyElement = param.split("=");

        if (this.response && bodyElement[1].includes(".")) {
          const bodyElementAlias = bodyElement[1].split("."); //[0] alias [1]column

          const keyResponse = bodyElementAlias[0].trim();
          const propsInKeyResponse = bodyElementAlias[1].trim();

          if (Object.keys(this.response)?.includes(keyResponse)) {
            if (
              Array(this.response[keyResponse]) &&
              this.response[keyResponse].length
            ) {
              bodyElement[1] =
                this.response[keyResponse][0][propsInKeyResponse];
            } else {
              bodyElement[1] = this.response[keyResponse][propsInKeyResponse];
            }
          }
        }

        body[bodyElement[0].trim()] = bodyElement[1].trim();
      });
    }

    return body;
  }

  private getHaving(query: string): string[] {
    let endIncludes = query.length;

    if (query.includes("then")) {
      endIncludes = query.indexOf("then");
    }

    return query
      .substring(query.indexOf("having"), endIncludes)
      .replace(/having/g, "")
      .replace(/ /g, "")
      .trim()
      .split(",");
  }
  private handleHavingConditionCount(
    res: any,
    blocoThen: string,
    querysThen: string,
    aliasBodyResponse: string,
    having: string[]
  ) {
    const conditionCount = having
      .find((el: string) => el.includes("count"))
      ?.replace(/count/g, "")
      .replace(/;/, "");

    if (conditionCount) {
      const count = parseInt(conditionCount.replace(/[^0-9]/g, ""));
      const operator = conditionCount.replace(/[0-9]/g, "");
      const objData = res.length ? res.length : [res].length;

      if (this.evaluateComparison(objData + operator + count)) {
        if (blocoThen) {
          querysThen += blocoThen;
        }

        this.response["validate"] = {
          ...this.response["validate"],
          [aliasBodyResponse]: true,
        };
      } else {
        this.response["validate"] = {
          ...this.response["validate"],
          [aliasBodyResponse]: false,
        };
      }
    }

    return querysThen;
  }

  private getAlias(query: string) {
    return query
      .substring(
        query.indexOf("as"),
        query.includes(" in ")
          ? query.indexOf(" in ")
          : query.includes("where")
          ? query.indexOf("where")
          : query.includes("having")
          ? query.indexOf("having")
          : query.includes("body")
          ? query.indexOf("body")
          : query.length
      )
      .replace("as", "")
      .replace(";", "")
      .replace(/ /, "")
      .trim();
  }
  private getIn(query: string) {
    return query
      .substring(
        query.indexOf(" in "),
        query.includes("where")
          ? query.indexOf("where")
          : query.includes("having")
          ? query.indexOf("having")
          : query.includes("body")
          ? query.indexOf("body")
          : query.length
      )
      .replace("as", "")
      .replace(";", "")
      .replace(/ /, "")
      .trim();
  }

  private getQueryType(query: string) {
    const querySplit = query.split(" ").filter((item) => item);
    const queryType = querySplit[0];
    if (queryType != "from" && queryType != "to") {
      throw new Error(
        "Tipo da query não identificada  - from or to is required"
      );
    }
    const microService = querySplit[1].split(".")[0];
    const entity = querySplit[1].split(".")[1];

    return { queryType, microService, entity };
  }

  private getThen(querys: string[], index: number) {
    return querys[index].includes("then")
      ? querys[index]
          .substring(
            querys[index].indexOf("then"),
            querys[index].indexOf("end")
          )
          .replace("then", "")
          .trim()
      : "";
  }

  private getQueryExcludeThen(querys: string[], index: number) {
    return querys[index].substring(
      0,
      querys[index].includes("then")
        ? querys[index].indexOf("then")
        : querys[index].length
    );
  }

  private addToObjectByPath(
    obj: Record<string, any>,
    path: string,
    alias: string,
    value: any
  ): Record<string, any> {
    path = `${path}.${alias}`;
    const keys = path.split(".");
    let currentObj = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      currentObj = currentObj[key] = currentObj[key] || {};
    }

    currentObj[keys[keys.length - 1]] = value;
    return currentObj;
  }

  private getUri(microService: string, entity: string) {
    const listService = Object.keys(this.apis).filter((config) =>
      config.toLowerCase().includes(microService.toLowerCase())
    );
    const base = listService.find(
      (service) => !service.toLowerCase().includes("path")
    );
    const path = listService.find((service) =>
      service.toLowerCase().includes("path")
    );

    if (!base || !path) {
      throw new Error(`Falta url ou path`);
    }

    const baseUrl = `${this.apis[base]}${this.apis[path]}`;
    const entityUrl = entity ? `/${entity}` : "";
    return `${baseUrl}${entityUrl}`;
  }

  private evaluateComparison(expression: string) {
    const operators: { [key: string]: any } = {
      "<": (a: string, b: string) => a < b,
      "<=": (a: string, b: string) => a <= b,
      ">": (a: string, b: string) => a > b,
      ">=": (a: string, b: string) => a >= b,
      "==": (a: string, b: string) => a === b,
      "!=": (a: string, b: string) => a !== b,
    };

    const match = expression.match(/(\d+)([<>!=]+)(\d+)/);

    if (match) {
      const [text, left, operator, right] = match;

      const numLeft = parseInt(left);
      const numRight = parseInt(right);

      if (operators[operator]) {
        if (operators[operator](numLeft, numRight)) {
          return true;
        } else {
          return false;
        }
      } else {
        throw new Error("Operador desconhecido.");
      }
    } else {
      throw new Error(`Expressão inválida: ${expression}`);
    }
  }

  private identityPrivateParams(query: string, states: any) {
    const regex = /@[\w.]+/g;
    const matches = query.match(regex);
    if (!matches || !matches.length) {
      return query;
    }
    matches.forEach((matche) => {
      const enviroment = matche.replace("@", "");
      const listParams = enviroment.split(".");
      let objValue: { [key: string]: any } = {};
      Object.entries(states).forEach(([key, value]) => {
        if (key.toLowerCase() == listParams[0].toLowerCase()) {
          objValue[key.toLowerCase()] = value;
        }
      });
      if (Object.keys(objValue).length) {
        for (let index = 0; index < listParams.length; index++) {
          objValue = objValue[listParams[index].toLowerCase()];
        }
      } else {
        objValue = { undefined: "undefined" };
      }
      query = query.replace(matche, objValue.toString());
    });
    return query;
  }

  public async run(
    queryCommand?: string,
    objIncludes?: { [key: string]: any }
  ): Promise<{ [key: string]: any } | undefined> {
    try {
      if (queryCommand) {
        this.queryCommand = queryCommand;
      }
      this.response = { ...objIncludes };
      let querysThen = "";
      const querys = this.getQueries();

      for (let index = 0; index < querys.length; index++) {
        let filters: { [key: string]: any } = {};
        let body: { [key: string]: any } = {};
        let isQueryJoin: boolean = false;
        let searchParamsQuery: string = "";
        let having: any;
        let alias = "";
        let inValues = "";
        querys[index] = this.identityPrivateParams(
          querys[index],
          this.environments
        );
        const query = this.getQueryExcludeThen(querys, index);

        const blocoThen = this.getThen(querys, index);

        if (query.includes("as")) {
          alias = this.getAlias(query);
        }

        if (query.includes(" in ")) {
          inValues = this.getIn(query);
        }

        if (query.includes("body")) {
          body = this.getBody(query);
        }

        if (query.includes("where")) {
          const { inFilters, isJoin, searchParams } = this.getFilters(query);
          filters = inFilters;
          isQueryJoin = isJoin;
          searchParamsQuery = searchParams;
        }

        if (query.includes("having")) {
          having = this.getHaving(query);
        }

        const { queryType, microService, entity } = this.getQueryType(query);
        const uri = this.getUri(microService, entity);

        const service = new ApiService();
        let res: any;

        if (queryType == "from") {
          res = await service.get(uri, searchParamsQuery);
        } else if (queryType == "to") {
          res = await service.post(uri, body);
        }

        const aliasBodyResponse =
          alias || `${microService}${entity ? "." + entity : ""}`;

        if (having) {
          querysThen = this.handleHavingConditionCount(
            res,
            blocoThen,
            querysThen,
            aliasBodyResponse,
            having
          );
        }
        if (inValues) {
          const pathsKey = inValues.replace("in", "").trim();
          this.addToObjectByPath(
            this.response,
            pathsKey,
            aliasBodyResponse,
            res
          );
        } else {
          this.response[aliasBodyResponse] = res;
        }
      }
      if (querysThen) {
        return await this.run(querysThen, this.response);
      } else {
        return this.response;
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }
}
