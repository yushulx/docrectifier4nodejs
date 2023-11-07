// Dynamsoft Document Normalizer
document.getElementById("document-file").addEventListener("change", function () {
    let currentFile = this.files[0];
    if (currentFile == null) {
        return;
    }
    var fr = new FileReader();
    fr.onload = function () {
        let image = document.getElementById('document-image');
        image.src = fr.result;
    }
    fr.readAsDataURL(currentFile);
});

async function rectifyDocument() {
    const input = document.getElementById('document-file');
    const file = input.files[0];

    if (!file) {
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    let response = await fetch('/rectifydocument', {
        method: 'POST',
        body: formData
    });

    if (response.headers.get('Content-Type').includes('text/plain')) {
        let data = await response.text();
        document.getElementById('document-result').innerHTML = data;

        let divElement = document.getElementById("document-result");
        divElement.style.display = "block";

        divElement = document.getElementById("document-rectified-image");
        divElement.style.display = "none";
    }
    else if (response.headers.get('Content-Type').includes('application/octet-stream')) {
        let data = await response.blob();
        let img = document.getElementById('document-rectified-image');
        let url = URL.createObjectURL(data);
        img.src = url;

        let divElement = document.getElementById("document-rectified-image");
        divElement.style.display = "block";

        divElement = document.getElementById("document-result");
        divElement.style.display = "none";
    }
}
