async function fetchAllPages(apiFunction, params) {
  const allData = [];
  let page = 1;

  while (true) {
    const { data } = await apiFunction({ ...params, per_page: 100, page });
    allData.push(...data);

    if (data.length < 100) break; // Exit loop if fewer than 100 records are fetched
    page++;
  }

  return allData;
}

module.exports = fetchAllPages
