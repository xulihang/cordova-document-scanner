window.onload = function() {
    Dynamsoft.DWT.Containers = [{ContainerId: "dwtcontrolContainer", Width: "585px", Height: "513px"}];
    Dynamsoft.DWT.ProductKey = "t0076tgAAAJen7oryTxaXwvCASNbPyBjjD/O5hGeN1ZaJ45jWJmvaUrxkqwW+U7v7Rzur4o21zJZhLiqIc/lHfz9aOBalMF2BTgUAfL8l6Q==";
    Dynamsoft.DWT.UseLocalService = false; //Create the `WebTwain` instance in WASM mode as it doesn't need to scan documents
    Dynamsoft.DWT.ResourcesPath = "https://unpkg.com/dwt@17.1.1/dist";
    Dynamsoft.DWT.Load();
};
var ip = document.getElementById('remote');
ip.options.add(new Option("192.168.8.65","192.168.8.65"));
ip.onchange = function () {
    initRemoteDWT(ip.value);
}

var console = window['console'] ? window['console'] : { 'log': function () { } };

Dynamsoft.DWT.RegisterEvent('OnWebTwainReady', Dynamsoft_OnReady); // Register OnWebTwainReady event. This event fires as soon as Dynamic Web TWAIN is initialized and ready to be used

var DWObject;
var DWObjectRemote;

switchTab(null, 'scan')

function Dynamsoft_OnReady() {
    DWObject = Dynamsoft.DWT.GetWebTwain('dwtcontrolContainer'); // Get the Dynamic Web TWAIN object that is embeded in the div with id 'dwtcontrolContainer'
    initRemoteDWT(ip.value);
    if (DWObject) {
        DWObject.Viewer.width="100%";
        DWObject.Viewer.height="100%";
        DWObject.SetViewMode(2, 2);
        SetIfWebcamPlayVideo(false);
        loadCamerasList();
        document.getElementById('camerasource').onchange = function () {
            var deviceId = document.getElementById("camerasource").options[document.getElementById("camerasource").selectedIndex].value;
            DWObject.Addon.Camera.selectSource(deviceId).then(function () {
                SetIfWebcamPlayVideo(true);
                document.getElementById("switchButton").style.display = '';
            }, function (ex) { console.log(ex.message); });
        }
    }
}

function loadCamerasList(){        
    DWObject.Addon.Camera.getSourceList().then(function (sourceName) {
        var iCount = sourceName.length;
        for (var i = 0; i < iCount; i++) {
            document.getElementById("camerasource").options.add(new Option(sourceName[i].label, sourceName[i].deviceId));
        }
    });
}                

// Connect to the remote DWT service
function initRemoteDWT(ip) {
    Dynamsoft.DWT.DeleteDWTObject("remoteScan");
    DWObjectRemote = null;
    var dwtConfig = {
      WebTwainId:"remoteScan",
      Host: ip, 
      Port: '18622', 
      PortSSL: '18623', 
      UseLocalService:'true'
    };
   Dynamsoft.DWT.CreateDWTObjectEx(
      dwtConfig, 
      function (dwt) {
          DWObjectRemote = dwt;
          console.log('service connected!');
          loadRemoteScannersList(dwt);
          registerTransferEvent(dwt);
      }, 
      function (error){
          console.log(error)
      }
    );
}

function loadRemoteScannersList(dwt){
    // Update the remote scanner list
    var remoteSelect = document.getElementById('remotesource');
    dwt.GetSourceNamesAsync().then(function (result) {
        // Remove previous options
        remoteSelect.innerHTML="";

        for (var i = 0; i < result.length; i++)
            remoteSelect.options.add(new Option(result[i], i));
    },
        function (fail) {
            console.log(fail);
        });
}

function registerTransferEvent(dwt){
    dwt.RegisterEvent('OnPostTransferAsync', function(outputInfo){
      dwt.ConvertToBlob(
          [dwt.ImageIDToIndex(outputInfo.imageId)], 
          Dynamsoft.DWT.EnumDWT_ImageType.IT_PNG, 
          function (result, indices, type) {
              DWObject.LoadImageFromBinary(
                  result,         
                  function () {
                      console.log('LoadImageFromBinary success');
                      dwt.RemoveImage(dwt.ImageIDToIndex(outputInfo.imageId));
                  },
                  function (errorCode, errorString) {
                      console.log(errorString);
                  }
              );
          },
          function (errorCode, errorString) {
              console.log(errorString);
          }
      );
  });
}

function SetIfWebcamPlayVideo(bShow) {
    if (bShow) {
        var camerasource = document.getElementById("camerasource").options[document.getElementById("camerasource").selectedIndex].value;
        var cameramode = "document";
        if (document.getElementById("cameraModePic").checked){
            cameramode = "picture";
        }
        document.getElementById("switchButton").value = "Loading";
        DWObject.Addon.Camera.showVideo(camerasource, { width: 2594, height: 1920 }, cameramode, false).then(function (r) {
            isVideoOn = true;
            document.getElementById("switchButton").value = "Hide Video";
        }, function (ex) {
            console.log(ex.message);
            DWObject.Addon.Camera.stop();
            document.getElementById("switchButton").value = "Show Video";
        });
    }
    else {
        DWObject.Addon.Camera.closeVideo();
        isVideoOn = false;
        document.getElementById("switchButton").value = "Show Video";

    }
}

function SwitchViews() {
    if (isVideoOn == false) {
        // continue the video
        SetIfWebcamPlayVideo(true);
    } else {
        // stop the video
        SetIfWebcamPlayVideo(false);
    }
}

function RemoteScan(){
    AcquireImage(true);
}

function AcquireImage(isRemote) {
    var pixelType,feederEnabled,duplexEnabled,showUI,resolution;
    //Pixel type
    if (document.getElementById("BW").checked)
        pixelType = Dynamsoft.DWT.EnumDWT_PixelType.TWPT_BW;
    else if (document.getElementById("Gray").checked)
        pixelType = Dynamsoft.DWT.EnumDWT_PixelType.TWPT_GRAY;
    else if (document.getElementById("RGB").checked)
        pixelType = Dynamsoft.DWT.EnumDWT_PixelType.TWPT_RGB;
    //If auto feeder
    if (document.getElementById("ADF").checked)
        feederEnabled = true;
    else
        feederEnabled = false;
    //If duplex
    if (document.getElementById("Duplex").checked)
        duplexEnabled = true;
    else
        duplexEnabled = false;
    //If show UI
    if (document.getElementById("ShowUI").checked)
        showUI = true;
    else
        showUI = false;
    //Resolution
    resolution = parseInt(document.getElementById("Resolution").value);
    if (isRemote){
        if (DWObjectRemote){
            var OnAcquireImageSuccess, OnAcquireImageFailure = function () {
                console.log("remote scan done");
                //DWObjectRemote.CloseSource();
            };
            DWObjectRemote.CloseSource();
            var sourceIndex = document.getElementById("remotesource").selectedIndex;                      
            var deviceConfiguration = {
              SelectSourceByIndex: sourceIndex,
              IfShowUI: showUI,
              PixelType: pixelType,
              Resolution: resolution,
              IfFeederEnabled: feederEnabled,
              IfDuplexEnabled: duplexEnabled,
              IfDisableSourceAfterAcquire: true,
              RemoteScan: true,
              ShowRemoteScanUI: true
            };
            console.log("sourceIndex: "+sourceIndex);
            DWObjectRemote.AcquireImage(deviceConfiguration, OnAcquireImageSuccess, OnAcquireImageFailure);
        }                            
    }

}

//Callback functions for async APIs
function OnSuccess() {
    console.log('successful');
}

function OnFailure(errorCode, errorString) {
    alert(errorString);
}

function OnFailure2() {
    console.log("error");
}


function LoadLocal(){
    DWObject.IfShowFileDialog = true;
    // PDF Rasterizer Addon is used here to ensure PDF support
    DWObject.Addon.PDF.SetResolution(200);
    DWObject.Addon.PDF.SetConvertMode(Dynamsoft.DWT.EnumDWT_ConvertMode.CM_RENDERALL);
    DWObject.LoadImageEx("", Dynamsoft.DWT.EnumDWT_ImageType.IT_ALL, OnSuccess, OnFailure);
}


function OnEmptyResponse() {
    console.log('empty response');
}
function OnServerReturnedSomething(errorCode, errorString, sHttpResponse) {
    console.log(errorString);
    console.log(sHttpResponse);
    var response;
    try {
        response = JSON.parse(sHttpResponse);
    }
    catch(err) {
        console.log(err);
        return;
    }
    if (response.status=="success"){
        alert("Uploaded.")
    }else{
        alert("Failed.");
    }
}
/**
 * Upload the images specified by their indices in the specified file type.
 * @param indices Specify the images
 * @param type Specify the file type
 */
function Upload() {
    var protocol = Dynamsoft.Lib.detect.ssl ? "https://" : "http://",
        port = window.location.port === "" ? 80 : window.location.port,
        actionPage = "/Upload";
    // path to the server-side script
    
    var url = protocol + window.location.hostname + ":" + port + actionPage;
    console.log(url);
    var fileName = getFormattedDate() + ".jpg";
    if (DWObject) {
        DWObject.HTTPUpload(
            url,
            DWObject.SelectedImagesIndices,
            Dynamsoft.DWT.EnumDWT_ImageType.IT_JPG,
            Dynamsoft.DWT.EnumDWT_UploadDataFormat.Binary,
            fileName,
            OnEmptyResponse,
            OnServerReturnedSomething
        );
    }
}

function getFormattedDate() {
    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;
    var str = date.getFullYear().toString() + month + day + hour + min + sec;
    return str;
}

function SaveWithFileDialog() {
    if (DWObject) {
        if (DWObject.HowManyImagesInBuffer > 0) {
            DWObject.IfShowFileDialog = true;
            var filename=document.getElementById("filename").value;
            if (document.getElementById("imgTypejpeg").checked == true) {
                //If the current image is B&W
                //1 is B&W, 8 is Gray, 24 is RGB
                if (DWObject.GetImageBitDepth(DWObject.CurrentImageIndexInBuffer) == 1)
                    //If so, convert the image to Gray
                    DWObject.ConvertToGrayScale(DWObject.CurrentImageIndexInBuffer);
                //Save image in JPEG
                DWObject.SaveAsJPEG(filename+".jpg", DWObject.CurrentImageIndexInBuffer);
            }
            else if (document.getElementById("imgTypetiff").checked == true)
                DWObject.SaveAllAsMultiPageTIFF(filename+".tiff", OnSuccess, OnFailure);
            else if (document.getElementById("imgTypepdf").checked == true)
                DWObject.SaveAllAsPDF(filename+".pdf", OnSuccess, OnFailure);
        }
    }
}


function MoveSelectedUp() {
    if (DWObject) {
        var indices=DWObject.SelectedImagesIndices;
        var firstIndex = indices[0];
        DWObject.MoveImage(firstIndex, firstIndex-1);                
    }
}

function MoveSelectedDown() {
    if (DWObject) {
        var indices=DWObject.SelectedImagesIndices;
        var firstIndex = indices[0];
        DWObject.MoveImage(firstIndex, firstIndex+1);                
    }
}

function RemoveSelectedImages() {
    if (DWObject) {
        DWObject.RemoveAllSelectedImages();
    }
}

function RemoveBlankImages() {
    if (DWObject) {
        var indices=[];
        for (var i=0; i<DWObject.HowManyImagesInBuffer; i=i+1){    
            if (DWObject.IsBlankImage(i)==true){
                indices.push(i);
            }
        }
        if (indices.length>0){
            DWObject.SelectImages(indices);
            DWObject.RemoveAllSelectedImages();
        }
    }
}

function RemoveAllImages() {
    if (DWObject) {
        DWObject.RemoveAllImages();
    }
}

function SetViewMode(){
    if (DWObject) {
        var colNum = parseInt(document.getElementById("colNum").value);
        var rowNum = parseInt(document.getElementById("rowNum").value);
        DWObject.SetViewMode(colNum,rowNum);
    }        
}

function ViewModeNumChanged(isColumn,value){
    if (isColumn){
        document.getElementById("colNumDisplay").innerText=value;
    }else{
        document.getElementById("rowNumDisplay").innerText=value;
    }            
}

function ShowImageEditor(){
    var editorSettings = {
        /*element: document.getElementById("imageEditor"),
        width: 600,
        height: 400,*/
        border: '1px solid rgb(204, 204, 204);',
        topMenuBorder: '',
        innerBorder: '',
        background: "rgb(255, 255, 255)",
        promptToSaveChange: true
    };
    var imageEditor = DWObject.Viewer.createImageEditor(editorSettings);
    imageEditor.show();
}
