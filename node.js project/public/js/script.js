// Event listeners
let editLinks = document.querySelectorAll(".edit");
for (editLink of editLinks) {
    editLink.addEventListener("click", getQuoteInfo);
}
let findQuoteButton = document.querySelector("#findQuoteButton");
findQuoteButton.addEventListener("click", searchForm);
let addQuoteModal = document.querySelector("#addQuoteButton");
addQuoteButton.addEventListener("click", addQuote);

async function getQuoteInfo() {
    var myModal = new bootstrap.Modal(document.getElementById('editModal'));
    myModal.show();
    let url = `/api/quote/${this.id}`;
    let response = await fetch(url);
    let data = await response.json();
    let quoteInfo = document.querySelector("#quoteInfo");
    quoteInfo.innerHTML = `
        <form method="POST" action="/quotes/edit">
            <div class="modal-body">
                <div class="mt-3 row">
                    <input type="hidden" value="${data[0].quoteId}" name="quoteId" id="quoteId">
                    <div class="col-2"> Quote:    </div> 
                    <div class="col-10"> <input type="text" value="${data[0].quote}" name="quote" size="75"> </div>
                </div>
                <div class="mt-3 row">
                    <div class="col-2"> Likes: </div>
                    <div class="col-10"> <input type="number" value="${data[0].likes}" name="likes"> </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" formaction="/quotes/edit" formmethod="POST" class="btn btn-primary">Save changes</button>
            </div>
        </form>    
    `;
};

async function searchForm() {
    var myModal = new bootstrap.Modal(document.getElementById('searchModal'));
    myModal.show();
};

async function addQuote() {
    var myModal = new bootstrap.Modal(document.getElementById('addQuoteModal'));
    myModal.show();
};