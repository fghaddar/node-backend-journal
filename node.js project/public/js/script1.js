let register = document.querySelector("#registerLink");
register.addEventListener("click", registerFunc);

async function registerFunc() {
    console.log("reached");
    var myModal = new bootstrap.Modal(document.getElementById('registerModal'));
    myModal.show();
};