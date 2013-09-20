<%@ taglib uri="http://www.springframework.org/tags" prefix="spring" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>

<%@taglib prefix="JSV" uri="http://ippon.fr/projects/jsv/" %>

<spring:url value="/validate" javaScriptEscape="true" var="validate_url"/>
<spring:url value="/validate2" javaScriptEscape="true" var="validate_url2"/>

<form:form commandName="formBean" method="POST"
		   cssClass="uni-form" servletRelativeAction="/send" id="FormBean">
	<div id="FormBean_errors">

	</div>

	<div class="ctrl-holder">
		<form:label path="firstname">
			<spring:message code="firstname.label"/>
		</form:label>
		<form:input path="firstname"/>
		<div id="firstname_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<form:label path="lastname">
			<spring:message code="lastname.label"/>
		</form:label>
		<form:input path="lastname"/>
		<div id="lastname_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<form:label path="age">
			<spring:message code="age.label"/>
		</form:label>
		<form:input path="age"/>
		<div id="age_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<form:label path="languages">
			<spring:message code="languages.label"/>
		</form:label>
		<form:checkboxes items="${formBean.languageList}" path="languages"/>
		<div id="languages_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<form:label path="sports">
			<spring:message code="sports.label"/>
		</form:label>
		<form:select path="sports" items="${formBean.sportList}" multiple="true"/>
		<div id="sports_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<form:label path="promoCode">
			<spring:message code="promoCode.label"/>
		</form:label>
		<form:input path="promoCode"/>
		<div id="promoCode_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<input type="submit" value="<spring:message code="send" />">
	</div>
</form:form>

<script type="text/javascript" src="js/jsv_api.js"></script>
<JSV:validator formId="FormBean" form="${formBean}" var="formBeanValidator">
	{
		errorLocalMessageTemplate: "<span class='{{class}} test'>{{message}}</span>",
		ajaxValidateFieldURL:"${validate_url2}",
		ajaxValidateFieldParams: function(objectName, fieldName, fieldvalue, constaints){
			var data = {
				fieldName: fieldName,
				constraints: constaints
			};
			data[fieldName] = fieldvalue;
			return data;
		}
	}
</JSV:validator>
<script type="text/javascript">
	var firstNamefield = formBeanValidator.getFieldWithName("firstname");
	var lastNamefield = formBeanValidator.getFieldWithName("lastname");
	var languagesField = formBeanValidator.getFieldWithName("languages");
	var ageField = formBeanValidator.getFieldWithName("age");
	var sportsField = formBeanValidator.getFieldWithName("sports");
	var promoCodeField = formBeanValidator.getFieldWithName("promoCode");
	var form = formBeanValidator.getForm();

	languagesField.bindValidationToEvent("click");
	ageField.bindValidationToEvent("keyup");
	sportsField.bindValidationToEvent("change");
	promoCodeField.bindValidationToEvent("keyup").setValidationDelay("1000");

	lastNamefield.bindValidationToEvent("keyup")
			.addPreValidationProcess(function(event, field){
				console.log("PRE VALIDATING LAST name on keyup");
			})
			.addPostValidationBeforeMessageProcess(function(event, field, ruleViolations){
				console.log("POST VALIDATING Last name on KEYUP");
				ruleViolations.forEach(function(ruleViolation){
					if(ruleViolation.constraint == "NotEmpty"){
						ruleViolation.params.message += " ohohooh";
					}
				});

				return ruleViolations;
			});

	firstNamefield.bindValidationToEvent("keyup")
			.addPreValidationProcess(function(event, field){
				console.log("PRE VALIDATING firstname on KEYUP");
			})
			.addPostValidationBeforeMessageProcess(function(event, field, ruleViolations){
				console.log("POST VALIDATING firstname on KEYUP");
				ruleViolations.forEach(function(ruleViolation){
					if(ruleViolation.constraint == "NotEmpty"){
						ruleViolation.params.message += " ahahaha";
					}
				});

				return ruleViolations;
			});



	form.addFieldsPreValidationProcess(function (event) {
		        console.log("Pre-validation method for each form field");
		    })
	    .addFieldsPostValidationBeforeMessageProcess(function (event, ruleViolationsByField) {
		        console.log("Post-validation method used to update error messages, if any");
		    })
	    .addFieldsPostValidationAfterMessageProcess(function (event) {
		        console.log("Post-validation method used after messages have been displayed, if any");
		    })
	    .bindValidationToSubmit()
	    .addPreSubmitValidationProcess(function (event) {
		        console.log("Pre-validation method for 'submit' event");
		    })
	    .addPostSubmitValidationProcess(function (event, ruleViolationsByField) {
		        console.log("Post-validation method for 'submit' event");
		        ruleViolationsByField.forEach(function (ruleViolationA) {
			            console.log("Field in error: " +  ruleViolationA.field + " with " +
					                     ruleViolationA.ruleViolations.length + " errors");
			        });
			});
</script>