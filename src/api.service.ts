type Method = "GET" | "POST" | "PUT" | "DELETE";

class ApiService {
  //   protected baseURL: string;

  constructor() {}

  private headers(): { [key: string]: any } {
    const headers: any = {
      "Content-Type": "application/json",
    };

    // const token = this.cacheController.get('BearerTokenGlobal');

    // if (token) {
    //   headers.Authorization = `Bearer ${token}`;
    // }
    return headers;
  }

  private async instance(
    url: string,
    method: Method,
    bodyData?: any
  ): Promise<any> {
    const config: any = {
      method: method,
      headers: this.headers(),
      credentials: "omit",
    };

    if (method === "POST" || method === "PUT") {
      config.body = JSON.stringify(bodyData) || null;
    }

    return fetch(`${url}`, config)
      .then(async (response) => {
        if (response.status == 401 || response.status == 403) {
          //   await this.cacheController.delete('BearerTokenGlobal');
          //   await this.cacheController.delete('InfoUserWallet');
          //   const cookie = await this.cookiesController.getCookiesByDomains(DOMAIN_COOKIES_AUTH);
          //   const authenticate = new Authentication();
          //   await authenticate.removeAuthCookiePrefixLogin(cookie, HOME_URL);
        }

        return response.json();
      })
      .then((response) => {
        // const res = removeSellers(response, [1582, 9385]);
        return {
          data: response,
        };
      })
      .catch((error) => {
        throw error;
      });
  }

  public async get(url: string, _searchParams?: string): Promise<any> {
    const finalUrl = `${url}${[_searchParams] ? `?${_searchParams}` : ""}`;
    return this.instance(finalUrl, "GET");
  }

  public async post(url: string, data: any): Promise<any> {
    return this.instance(url, "POST", data);
  }

  public async put(url: string, data: any): Promise<any> {
    return this.instance(url, "PUT", data);
  }

  public async delete(url: string, params: [{ key: any }]): Promise<any> {
    return this.instance(url, "DELETE");
  }
}

// const ApiService = new ApiService();

export { ApiService };
